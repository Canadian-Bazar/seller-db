import Invoice from '../models/invoice.schema.js';
import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import Quotation from '../models/quotations.schema.js';
import Chat from '../models/chat.schema.js';
import mongoose from 'mongoose';
import Seller from '../models/seller.schema.js'
import Buyer from '../models/buyer.schema.js'
import { getNextSequence, formatInvoiceNumber } from '../helpers/getNextSequence.js'
import { redisClient } from '../redis/redis.config.js';
import storeMessageInRedis from '../helpers/storeMessageInRedis.js';
import sendNotification from '../helpers/sendNotification.js';
import ServiceQuotation from '../models/service-quotations.schema.js'
import ServiceChat from '../models/service-chat.schema.js'



export const generateInvoice = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const validatedData = matchedData(req);
        const sellerId = req.user._id;
        const quotationId = validatedData.quotationId;

        console.log('Processing quotation:', quotationId);

        // Step 1: Find quotation with minimal population to reduce lock time
        const quotation = await Quotation.findById(quotationId)
            .select('seller buyer status')
            .populate('seller', 'companyName logo email phone street city state zip companyWebsite businessNumber')
            .session(session);
        
        if (!quotation) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Quotation not found');
        }
        
        if (quotation.seller._id.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You are not authorized to create invoice for this quotation');
        }

        // Step 2: Handle chat logic with optimized queries
        let chat = await Chat.findOne({ quotation: quotationId })
            .select('_id seller buyer quotation phase activeInvoice')
            .session(session);

        console.log('Found chat:', chat?._id);

        // Check for existing active invoice
        if (chat?.activeInvoice?.invoice) {
            const existingInvoice = await Invoice.findById(chat.activeInvoice.invoice)
                .select('status')
                .session(session);
            
            if (existingInvoice && existingInvoice.status === 'pending') {
                throw buildErrorObject(httpStatus.CONFLICT, 'There is already an active invoice for this quotation');
            }
        }

        // Validate chat phase
        if (chat && (chat.phase !== 'negotiation' && chat.phase !== 'invoice_rejected')) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid chat state to raise invoice');
        }

        // Step 3: Create chat if it doesn't exist
        if (!chat) {
            const newChat = new Chat({
                quotation: quotationId,
                seller: sellerId,
                buyer: quotation.buyer,
                phase: 'invoice_sent',
                createdAt: new Date()
            });
            chat = await newChat.save({ session });
        }

        // Step 4: Load party info
        const [sellerDoc, buyerDoc] = await Promise.all([
            Seller.findById(sellerId).select('companyName logo email phone street city state zip companyWebsite businessNumber').session(session),
            Buyer.findById(quotation.buyer).select('fullName email phoneNumber city state').session(session)
        ])

        // Step 5: Compute totals
        const itemsSubtotal = Array.isArray(validatedData.items) ? validatedData.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0) : 0
        const subtotal = itemsSubtotal > 0 ? itemsSubtotal : (Number(validatedData.negotiatedPrice) || 0)
        const taxAmount = Number(validatedData.taxAmount) || 0
        const shippingCharges = Number(validatedData.shippingCharges) || 0
        const additionalFees = Number(validatedData.additionalFees) || 0
        const totalAmount = subtotal + taxAmount + shippingCharges + additionalFees

        // Step 6: Invoice number and dates
        const seq = await getNextSequence('invoice', session)
        const invoiceNumber = formatInvoiceNumber(seq)
        const invoiceDate = new Date()
        const dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : new Date(invoiceDate)
        if (!validatedData.dueDate) {
            dueDate.setDate(dueDate.getDate() + 30) // default Net 30
        }
        
        const invoiceData = {
            quotationId,
            sellerId,
            buyer: quotation.buyer,
            chatId: chat._id,
            negotiatedPrice: subtotal,
            paymentTerms: validatedData.paymentTerms || 'Net 30',
            deliveryTerms: validatedData.deliveryTerms || null,
            taxAmount,
            shippingCharges,
            additionalFees,
            totalAmount,
            currency: validatedData.currency || 'CAD',
            acceptedPaymentMethods: validatedData.acceptedPaymentMethods || [],
            notes: validatedData.notes,
            items: Array.isArray(validatedData.items) ? validatedData.items.map(i => ({
                description: i.description,
                quantity: Number(i.quantity || 0),
                unitPrice: Number(i.unitPrice || 0),
                lineTotal: Number(i.quantity || 0) * Number(i.unitPrice || 0)
            })) : [],
            invoiceNumber,
            invoiceDate,
            dueDate,
            poNumber: validatedData.poNumber || null,
            seller: {
                id: sellerDoc._id,
                businessName: sellerDoc.companyName,
                logo: sellerDoc.logo || null,
                email: sellerDoc.email,
                phone: sellerDoc.phone,
                website: sellerDoc.companyWebsite || null,
                taxId: sellerDoc.businessNumber || null,
                address: {
                    street: sellerDoc.street || '',
                    city: sellerDoc.city || '',
                    state: sellerDoc.state || '',
                    postalCode: sellerDoc.zip || '',
                    country: 'Canada'
                }
            },
            buyerInfo: {
                id: buyerDoc._id,
                name: buyerDoc.fullName,
                email: buyerDoc.email || null,
                phone: buyerDoc.phoneNumber || null,
                address: {
                    city: buyerDoc.city || '',
                    state: buyerDoc.state || ''
                }
            },
            status: 'pending',
            viewedByBuyer: false,
            expiresAt: validatedData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date()
        };

        // Step 5: Create invoice
        const invoice = new Invoice(invoiceData);
        await invoice.save({ session });

        // Step 6: Generate token
        const token = generateInvoiceToken(invoice._id);

        // Step 7: Update quotation and chat in parallel with specific fields only
        const quotationUpdate = Quotation.findByIdAndUpdate(
            quotationId, 
            { 
                status: 'accepted',
                updatedAt: new Date()
            }, 
            { session, new: false }
        );

        const chatUpdate = Chat.findByIdAndUpdate(
            chat._id, 
            {
                phase: 'invoice_sent',
                activeInvoice: {
                    invoice: invoice._id,
                    status: 'pending',
                    createdAt: new Date(),
                    link: token
                },
                updatedAt: new Date()
            }, 
            { session, new: false }
        );

        // Execute updates in parallel
        await Promise.all([quotationUpdate, chatUpdate]);

        const message = {
            senderId: sellerId,
            senderModel: 'Seller',
            content: `Invoice sent for price ${validatedData.negotiatedPrice}`,
            chat: chat._id,
            quotationId: quotationId,
            messageType: 'link',
            isRead: false,
            createdAt: new Date(),
            media: [{
                url: token,
                type: 'pdf',
                name: `Invoice_${invoice._id}.pdf`,
                size: 0
            }]
        };

        const notificationData = {
            recipient: quotation.buyer,
            sender: {
                model: 'Seller',
                id: sellerId,
                name: quotation.seller.companyName,
                image: quotation.seller.logo || null
            },
            type: 'invoice_created',
            title: 'Invoice Received',
            message: `${quotation.seller.companyName} has sent you an invoice of CAD ${validatedData.negotiatedPrice}`,
            data: {
                invoiceId: invoice._id,
                chatId: chat._id,
                quotationId: quotationId,
                amount: validatedData.negotiatedPrice,
                invoiceLink: token
            }
        };

        // Commit transaction before external operations
        await session.commitTransaction();

        // Step 9: Handle external operations (Redis and notifications) after transaction
        try {
            await storeMessageInRedis(chat._id, message);
        } catch (redisError) {
            console.error('Redis error (non-blocking):', redisError);
        }

        try {
            await sendNotification(notificationData);
        } catch (notificationError) {
            console.error('Notification error (non-blocking):', notificationError);
        }

        res.status(httpStatus.CREATED).json(
            buildResponse(httpStatus.CREATED, {
                message: 'Invoice created successfully',
                invoiceId: invoice._id,
                invoiceLink: token,
                totalAmount: totalAmount
            })
        );

    } catch (err) {
        // Handle transaction rollback
        if (session.inTransaction()) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error('Error aborting transaction:', abortError);
            }
        }
        
        console.error('Invoice generation error:', err);
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};

const generateInvoiceToken = (invoiceId) => {
    return jwt.sign(
        { invoiceId },
        process.env.INVOICE_SECRET,
        { expiresIn: '30d' }
    );
};

export const getSellerInvoices = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { sellerId };
        if (status) filter.status = status;

        const invoices = await Invoice.find(filter)
            .populate('quotationId')
            .populate('chatId')
            .populate('buyerId', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Invoice.countDocuments(filter);

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                invoices,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const getInvoiceById = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const sellerId = req.user._id;

        const invoice = await Invoice.findOne({ _id: invoiceId, sellerId })
            .populate('quotationId')
            .populate('chatId')
            .populate('buyerId', 'fullName email');

        if (!invoice) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invoice not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, { invoice })
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const updateInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const sellerId = req.user._id;
        const validatedData = matchedData(req);

        const invoice = await Invoice.findOne({ _id: invoiceId, sellerId });

        if (!invoice) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invoice not found');
        }

        if (invoice.status !== 'pending') {
            throw buildErrorObject(httpStatus.CONFLICT, 'Cannot update processed invoice');
        }

        // Check if chat is still in invoice_sent phase
        const chat = await Chat.findById(invoice.chatId);
        if (chat.phase !== 'invoice_sent') {
            throw buildErrorObject(httpStatus.CONFLICT, 'Cannot update invoice. Chat phase has changed');
        }

        // Merge fields: use provided values, otherwise keep existing
        const currency = validatedData.currency ?? invoice.currency ?? 'CAD';
        const paymentTerms = validatedData.paymentTerms ?? invoice.paymentTerms ?? null;
        const deliveryTerms = validatedData.deliveryTerms ?? invoice.deliveryTerms ?? null;
        const poNumber = validatedData.poNumber ?? invoice.poNumber ?? null;
        const notes = validatedData.notes ?? invoice.notes ?? null;
        const acceptedPaymentMethods = Array.isArray(validatedData.acceptedPaymentMethods)
            ? validatedData.acceptedPaymentMethods
            : (invoice.acceptedPaymentMethods || []);
        const dueDate = validatedData.dueDate
            ? new Date(validatedData.dueDate)
            : (invoice.dueDate || null);

        // Items: if provided, normalize and compute line totals; else keep existing
        const hasIncomingItems = Array.isArray(validatedData.items) && validatedData.items.length > 0;
        const nextItems = hasIncomingItems
            ? validatedData.items.map(i => ({
                description: i.description || '',
                quantity: Number(i.quantity || 0),
                unitPrice: Number(i.unitPrice || 0),
                lineTotal: Number(i.quantity || 0) * Number(i.unitPrice || 0)
            }))
            : (invoice.items || []);

        // Subtotal: prefer items subtotal when items present, otherwise negotiated/base price
        const itemsSubtotal = nextItems.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);
        const incomingNegotiatedPrice = validatedData.negotiatedPrice !== undefined
            ? Number(validatedData.negotiatedPrice)
            : undefined;
        const negotiatedPrice = incomingNegotiatedPrice !== undefined
            ? incomingNegotiatedPrice
            : Number(invoice.negotiatedPrice || 0);

        const subtotal = itemsSubtotal > 0 ? itemsSubtotal : negotiatedPrice;

        // Charges
        const taxAmount = validatedData.taxAmount !== undefined
            ? Number(validatedData.taxAmount)
            : Number(invoice.taxAmount || 0);
        const shippingCharges = validatedData.shippingCharges !== undefined
            ? Number(validatedData.shippingCharges)
            : Number(invoice.shippingCharges || 0);
        const additionalFees = validatedData.additionalFees !== undefined
            ? Number(validatedData.additionalFees)
            : Number(invoice.additionalFees || 0);

        const totalAmount = subtotal + taxAmount + shippingCharges + additionalFees;

        // Persist merged values back to the document to preserve unchanged data
        invoice.currency = currency;
        invoice.paymentTerms = paymentTerms;
        invoice.deliveryTerms = deliveryTerms;
        invoice.poNumber = poNumber;
        invoice.notes = notes;
        invoice.acceptedPaymentMethods = acceptedPaymentMethods;
        invoice.dueDate = dueDate;
        invoice.items = nextItems;
        invoice.negotiatedPrice = negotiatedPrice;
        invoice.taxAmount = taxAmount;
        invoice.shippingCharges = shippingCharges;
        invoice.additionalFees = additionalFees;
        invoice.totalAmount = totalAmount;

        const updatedInvoice = await invoice.save();
        await updatedInvoice.populate('quotationId');

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: 'Invoice updated successfully',
                invoice: updatedInvoice
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const deleteInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const sellerId = req.user._id;

        const invoice = await Invoice.findOne({ _id: invoiceId, sellerId });

        if (!invoice) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invoice not found');
        }

        if (invoice.status !== 'pending') {
            throw buildErrorObject(httpStatus.CONFLICT, 'Cannot delete processed invoice');
        }

        // Fetch chat to capture current active invoice link for cleanup
        const chatDoc = await Chat.findById(invoice.chatId).select('activeInvoice seller buyer');

        const invoiceLinkToken = chatDoc?.activeInvoice?.link || null;

        // Reset chat phase back to negotiation
        await Chat.findByIdAndUpdate(invoice.chatId, {
            phase: 'negotiation',
            $unset: { activeInvoice: 1 }
        });

        await Invoice.findByIdAndDelete(invoiceId);

        // Try to remove the previously-sent invoice link message from Redis queue
        try {
            const queueKey = `MESSAGEQUEUE:${invoice.chatId}`;
            const allMessages = await redisClient.lrange(queueKey, 0, -1);
            if (Array.isArray(allMessages) && allMessages.length > 0 && invoiceLinkToken) {
                for (const raw of allMessages) {
                    try {
                        const msg = JSON.parse(raw);
                        const msgToken = Array.isArray(msg?.media) ? msg.media?.[0]?.url : null;
                        if (msg?.messageType === 'link' && msgToken && msgToken === invoiceLinkToken) {
                            // Remove all occurrences matching this serialized payload
                            await redisClient.lrem(queueKey, 0, raw);
                        }
                    } catch (parseErr) {
                        // Ignore malformed messages
                    }
                }
            }
        } catch (redisCleanupError) {
            console.error('Redis cleanup error (non-blocking):', redisCleanupError);
        }

        // Push a system message to notify participants that invoice was withdrawn
        try {
            const systemMessage = {
                senderId: sellerId,
                senderModel: 'Seller',
                content: 'Invoice has been withdrawn by the seller. A new invoice can be generated with updated terms.',
                chat: invoice.chatId,
                messageType: 'text',
                isRead: false,
                createdAt: new Date(),
                businessContext: {
                    isSystemMessage: true,
                    isBusinessAction: true,
                    actionType: 'invoice_deleted',
                    actionData: { invoiceId: String(invoiceId) }
                }
            };
            await storeMessageInRedis(invoice.chatId, systemMessage);
        } catch (redisSystemMsgError) {
            console.error('Redis system message error (non-blocking):', redisSystemMsgError);
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, { message: 'Invoice deleted successfully' })
        );

    } catch (err) {
        handleError(res, err);
    }
};



export const getInvoiceDetails = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { invoiceToken } = validatedData;

        let decoded = jwt.verify(invoiceToken, process.env.INVOICE_SECRET);
        const invoiceId = decoded.invoiceId;

        const invoiceDetails = await Invoice.findById(invoiceId)
            .populate({
                path: 'quotationId',
                populate: [
                    {
                        path: 'productId',
                        select: 'name images category description'
                    },
                    {
                        path: 'buyer',
                        select: 'fullName profilePic email phoneNumber city state avatar'
                    }
                ]
            })
            .populate('sellerId', 'companyName email logo phone city state');

        if (!invoiceDetails) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invoice not found');
        }

        if (invoiceDetails.expiresAt < new Date()) {
            throw buildErrorObject(httpStatus.GONE, 'Invoice has expired');
        }

        // Update viewing status if not already viewed
        if (!invoiceDetails.viewedByBuyer) {
            await Invoice.findByIdAndUpdate(invoiceId, {
                viewedByBuyer: true,
                viewedAt: new Date()
            });
            
            // Update the local object to reflect the change
            invoiceDetails.viewedByBuyer = true;
            invoiceDetails.viewedAt = new Date();
        }

        // Structure the response to match the expected format in the React component
        const response = {
            data: {
                response: invoiceDetails
            }
        };

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, response.data.response)
        );

    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return handleError(res, buildErrorObject(httpStatus.UNAUTHORIZED, 'Invalid invoice token'));
        }
        if (err.name === 'TokenExpiredError') {
            return handleError(res, buildErrorObject(httpStatus.UNAUTHORIZED, 'Invoice token has expired'));
        }
        handleError(res, err);
    }
};

// Prefill API to fetch product/service, seller and buyer details for invoice creation
export const getInvoicePrefill = async (req, res) => {
    try {
        const validated = matchedData(req);
        const { type, chatId, quotationId } = validated;
        const sellerId = req.user._id;

        if (type === 'service') {
            // Resolve service quotation
            let quotation;
            if (quotationId) {
                quotation = await ServiceQuotation.findById(quotationId)
                    .populate({
                        path: 'serviceId',
                        select: 'name images category description'
                    })
                    .populate({ path: 'buyer', select: 'fullName email phoneNumber city state avatar profilePic' });
            } else if (chatId) {
                const chat = await ServiceChat.findOne({ _id: chatId, seller: sellerId }).select('quotation seller buyer');
                if (!chat) {
                    throw buildErrorObject(httpStatus.NOT_FOUND, 'Service chat not found');
                }
                quotation = await ServiceQuotation.findById(chat.quotation)
                    .populate({
                        path: 'serviceId',
                        select: 'name images category description'
                    })
                    .populate({ path: 'buyer', select: 'fullName email phoneNumber city state avatar profilePic' });
            }

            if (!quotation) {
                throw buildErrorObject(httpStatus.NOT_FOUND, 'Service quotation not found');
            }

            if (quotation.seller.toString() !== sellerId.toString()) {
                throw buildErrorObject(httpStatus.FORBIDDEN, 'Unauthorized to access this service quotation');
            }

            const sellerDoc = await Seller.findById(sellerId).select('companyName logo email phone street city state zip companyWebsite businessNumber');

            const response = {
                type: 'service',
                quotationId: quotation._id,
                priceRange: { min: quotation.minPrice || 0, max: quotation.maxPrice || 0 },
                productService: {
                    name: quotation.serviceId?.name || '',
                    image: Array.isArray(quotation.serviceId?.images) ? quotation.serviceId.images[0] : null,
                    category: quotation.serviceId?.category || '',
                    description: quotation.description || quotation.serviceId?.description || '',
                    quantity: undefined
                },
                sellerInfo: {
                    businessName: sellerDoc?.companyName || '',
                    logo: sellerDoc?.logo || null,
                    email: sellerDoc?.email || '',
                    phone: sellerDoc?.phone || '',
                    website: sellerDoc?.companyWebsite || null,
                    address: {
                        street: sellerDoc?.street || '',
                        city: sellerDoc?.city || '',
                        state: sellerDoc?.state || '',
                        postalCode: sellerDoc?.zip || '',
                        country: 'Canada'
                    },
                    taxId: sellerDoc?.businessNumber || null
                },
                buyerInfo: {
                    name: quotation.buyer?.fullName || '',
                    email: quotation.buyer?.email || '',
                    phone: quotation.buyer?.phoneNumber || '',
                    city: quotation.buyer?.city || '',
                    state: quotation.buyer?.state || ''
                },
                currency: 'CAD'
            };

            return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
        }

        // Default: product
        let quotation;
        if (quotationId) {
            quotation = await Quotation.findById(quotationId)
                .populate({
                    path: 'productId',
                    select: 'name images category description'
                })
                .populate({ path: 'buyer', select: 'fullName email phoneNumber city state avatar profilePic' });
        } else if (chatId) {
            const chat = await Chat.findOne({ _id: chatId, seller: sellerId }).select('quotation seller buyer');
            if (!chat) {
                throw buildErrorObject(httpStatus.NOT_FOUND, 'Chat not found');
            }
            quotation = await Quotation.findById(chat.quotation)
                .populate({
                    path: 'productId',
                    select: 'name images category description'
                })
                .populate({ path: 'buyer', select: 'fullName email phoneNumber city state avatar profilePic' });
        }

        if (!quotation) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Quotation not found');
        }

        if (quotation.seller.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'Unauthorized to access this quotation');
        }

        const sellerDoc = await Seller.findById(sellerId).select('companyName logo email phone street city state zip companyWebsite businessNumber');

        const response = {
            type: 'product',
            quotationId: quotation._id,
            priceRange: { min: quotation.minPrice || 0, max: quotation.maxPrice || 0 },
            productService: {
                name: quotation.productId?.name || '',
                image: Array.isArray(quotation.productId?.images) ? quotation.productId.images[0] : null,
                category: quotation.productId?.category || '',
                description: quotation.description || quotation.productId?.description || '',
                quantity: quotation.quantity || 1
            },
            sellerInfo: {
                businessName: sellerDoc?.companyName || '',
                logo: sellerDoc?.logo || null,
                email: sellerDoc?.email || '',
                phone: sellerDoc?.phone || '',
                website: sellerDoc?.companyWebsite || null,
                address: {
                    street: sellerDoc?.street || '',
                    city: sellerDoc?.city || '',
                    state: sellerDoc?.state || '',
                    postalCode: sellerDoc?.zip || '',
                    country: 'Canada'
                },
                taxId: sellerDoc?.businessNumber || null
            },
            buyerInfo: {
                name: quotation.buyer?.fullName || '',
                email: quotation.buyer?.email || '',
                phone: quotation.buyer?.phoneNumber || '',
                city: quotation.buyer?.city || '',
                state: quotation.buyer?.state || ''
            },
            currency: 'CAD'
        };

        return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
    } catch (err) {
        handleError(res, err);
    }
};