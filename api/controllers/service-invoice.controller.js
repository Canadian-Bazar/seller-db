import ServiceInvoice from '../models/service-invoice.schema.js';
import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import ServiceQuotation from '../models/service-quotations.schema.js';
import ServiceChat from '../models/service-chat.schema.js';
import mongoose from 'mongoose';
import { redisClient } from '../redis/redis.config.js';
import storeMessageInRedis from '../helpers/storeMessageInRedis.js';
import sendNotification from '../helpers/sendNotification.js';

export const generateServiceInvoice = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const validatedData = matchedData(req);
        const sellerId = req.user._id;
        const quotationId = validatedData.quotationId;

        console.log('Processing service quotation:', quotationId);

        // Step 1: Find quotation with minimal population to reduce lock time
        const quotation = await ServiceQuotation.findById(quotationId)
            .select('seller buyer status')
            .populate('seller', 'companyName logo')
            .session(session);
        
        if (!quotation) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service quotation not found');
        }
        
        if (quotation.seller._id.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You are not authorized to create invoice for this quotation');
        }

        // Step 2: Handle chat logic with optimized queries
        let chat = await ServiceChat.findOne({ quotation: quotationId })
            .select('_id seller buyer quotation phase activeInvoice')
            .session(session);

        console.log('Found service chat:', chat?._id);

        // Check for existing active invoice
        if (chat?.activeInvoice?.invoice) {
            const existingInvoice = await ServiceInvoice.findById(chat.activeInvoice.invoice)
                .select('status')
                .session(session);
            
            if (existingInvoice && existingInvoice.status === 'pending') {
                throw buildErrorObject(httpStatus.CONFLICT, 'There is already an active invoice for this service quotation');
            }
        }

        // Validate chat phase
        if (chat && (chat.phase !== 'negotiation' && chat.phase !== 'invoice_rejected')) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid chat state to raise invoice');
        }

        // Step 3: Create chat if it doesn't exist
        if (!chat) {
            const newChat = new ServiceChat({
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
    
            status: 'pending',
            viewedByBuyer: false,
            expiresAt: validatedData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
            createdAt: new Date()
        };

        // Step 5: Create invoice
        const invoice = new ServiceInvoice(invoiceData);
        await invoice.save({ session });

        // Step 6: Generate token
        const token = generateServiceInvoiceToken(invoice._id);

        // Step 7: Update quotation and chat in parallel with specific fields only
        const quotationUpdate = ServiceQuotation.findByIdAndUpdate(
            quotationId, 
            { 
                status: 'accepted',
                updatedAt: new Date()
            }, 
            { session, new: false }
        );

        const chatUpdate = ServiceChat.findByIdAndUpdate(
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
            content: `Service invoice sent for price ${validatedData.negotiatedPrice}`,
            chat: chat._id,
            quotationId: quotationId,
            messageType: 'link',
            isRead: false,
            createdAt: new Date(),
            media: [{
                url: token,
                type: 'pdf',
                name: `ServiceInvoice_${invoice._id}.pdf`,
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
            type: 'service_invoice_created',
            title: 'Service Invoice Received',
            message: `${quotation.seller.companyName} has sent you a service invoice of CAD ${validatedData.negotiatedPrice}`,
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
            await storeMessageInRedis(chat._id, message , 'service');
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
                message: 'Service invoice created successfully',
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
        
        console.error('Service invoice generation error:', err);
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};

const generateServiceInvoiceToken = (invoiceId) => {
    return jwt.sign(
        { invoiceId },
        process.env.SERVICE_INVOICE_SECRET || process.env.INVOICE_SECRET,
        { expiresIn: '30d' }
    );
};

export const getSellerServiceInvoices = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { sellerId };
        if (status) filter.status = status;

        const invoices = await ServiceInvoice.find(filter)
            .populate('quotationId')
            .populate('chatId')
            .populate('buyer', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await ServiceInvoice.countDocuments(filter);

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



export const getServiceInvoiceDetails = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { invoiceToken } = validatedData;

        let decoded = jwt.verify(invoiceToken, process.env.SERVICE_INVOICE_SECRET || process.env.INVOICE_SECRET);
        const invoiceId = decoded.invoiceId;

        const invoiceDetails = await ServiceInvoice.findById(invoiceId)
            .populate({
                path: 'quotationId',
                populate: [
                    {
                        path: 'serviceId',
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
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service invoice not found');
        }

        if (invoiceDetails.expiresAt < new Date()) {
            throw buildErrorObject(httpStatus.GONE, 'Service invoice has expired');
        }

        // Update viewing status if not already viewed
        if (!invoiceDetails.viewedByBuyer) {
            await ServiceInvoice.findByIdAndUpdate(invoiceId, {
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
            return handleError(res, buildErrorObject(httpStatus.UNAUTHORIZED, 'Invalid service invoice token'));
        }
        if (err.name === 'TokenExpiredError') {
            return handleError(res, buildErrorObject(httpStatus.UNAUTHORIZED, 'Service invoice token has expired'));
        }
        handleError(res, err);
    }
};