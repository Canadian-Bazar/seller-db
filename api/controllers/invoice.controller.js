import Invoice from '../models/invoice.schema.js';
import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import Quotation from '../models/quotations.schema.js';
import Chat from '../models/chat.schema.js';
import Message from '../models/messages.schema.js';
import mongoose from 'mongoose';
import { redisClient } from '../redis/redis.config.js';
import storeMessageInRedis from '../helpers/storeMessageInRedis.js';
import sendNotification from '../helpers/sendNotification.js';



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
            .populate('seller', 'companyName logo')
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

        // Step 4: Prepare invoice data
        const totalAmount = validatedData.negotiatedPrice + 
                           (validatedData.taxAmount || 0) + 
                           (validatedData.shippingCharges || 0);
        
        const invoiceData = {
            quotationId,
            sellerId,
            buyer: quotation.buyer,
            chatId: chat._id,
            negotiatedPrice: validatedData.negotiatedPrice,
            paymentTerms: validatedData.paymentTerms,
            deliveryTerms: validatedData.deliveryTerms,
            taxAmount: validatedData.taxAmount || 0,
            shippingCharges: validatedData.shippingCharges || 0,
            totalAmount: totalAmount,
            notes: validatedData.notes,
            status: 'pending',
            viewedByBuyer: false,
            expiresAt: validatedData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
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

        // Step 8: Prepare message and notification data
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
            message: `${quotation.seller.companyName} has sent you an invoice of ₹${validatedData.negotiatedPrice}`,
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

// Helper function to generate invoice token (if not already defined)
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

        // Recalculate total if needed
        if (validatedData.negotiatedPrice) {
            validatedData.totalAmount = validatedData.negotiatedPrice 
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(
            invoiceId,
            validatedData,
            { new: true }
        ).populate('quotationId');

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

        // Reset chat phase back to negotiation
        await Chat.findByIdAndUpdate(invoice.chatId, {
            phase: 'negotiation',
            $unset: { activeInvoice: 1 }
        });

        await Invoice.findByIdAndDelete(invoiceId);

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
                        select: 'fullName profilePic email phoneNumber city state'
                    }
                ]
            })
            .populate('sellerId', 'companyName email profileImage phone city state');

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