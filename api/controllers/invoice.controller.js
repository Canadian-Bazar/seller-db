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

const generateInvoiceToken = (invoiceId) => {
    return jwt.sign(
        { invoiceId }, 
        process.env.INVOICE_SECRET, 
        { expiresIn: '7d' }
    );
};
export const generateInvoice = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const validatedData = matchedData(req);
        const sellerId = req.user._id;
        const quotationId = validatedData.quotationId;

        console.log(quotationId)

        const quotation = await Quotation.findById(quotationId).populate('seller').session(session);
        
        if (!quotation) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Quotation not found');
        }
        
        if (quotation.seller._id.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You are not authorized to create invoice for this quotation');
        }

        let chat = await Chat.findOne({ quotation: quotationId }).session(session);

        console.log(chat)

        console.log(chat)

        if (chat) {
            if (chat.activeInvoice && chat.activeInvoice.invoice) {
                const existingInvoice = await Invoice.findById(chat.activeInvoice.invoice).session(session);
                if (existingInvoice && existingInvoice.status === 'pending') {
                    throw buildErrorObject(httpStatus.CONFLICT, 'There is already an active invoice for this quotation');
                }
            }

            if (chat.status === 'negotiation' ||  chat.status === 'invoice_rejected') {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid chat state to raise invoice');
            }
        } else {
            const chatArray = await Chat.create([{
                quotation: quotationId,
                seller: sellerId,
                buyer: quotation.buyer,
                phase: 'invoice_sent',
                createdAt: new Date()
            }], { session });
            chat = chatArray[0];
        }

        const totalAmount = validatedData.negotiatedPrice;
        
        const invoiceData = {
            ...validatedData,
            sellerId,
            chatId: chat._id,
            totalAmount: totalAmount
        };

        const invoiceArray = await Invoice.create([invoiceData], { session });
        const invoice = invoiceArray[0];

        const token = generateInvoiceToken(invoice._id);

        await Quotation.findByIdAndUpdate(
            quotationId, 
            { status: 'accepted' }, 
            { session }
        );

        await Chat.findByIdAndUpdate(
            chat._id, 
            {
                phase: 'invoice_sent',
                activeInvoice: {
                    invoice: invoice._id,
                    status: 'pending',
                    createdAt: new Date(),
                    link: token
                }
            }, 
            { session }
        );

        let message = {
            senderId: sellerId,
            senderModel: 'Seller',
            content: `Invoice sent for ₹${validatedData.negotiatedPrice}`,
            chat: chat._id,
            quotationId: validatedData.quotationId,
            messageType: 'link',
            isRead: false,
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

        await session.commitTransaction();

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
                invoiceLink: token
            })
        );

    } catch (err) {
        // Only abort if transaction is still active
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        handleError(res, err);
    } finally {
        session.endSession();
    }
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