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

const generateInvoiceToken = (invoiceId) => {
    return jwt.sign(
        { invoiceId }, 
        process.env.INVOICE_SECRET, 
        { expiresIn: '24h' }
    );
};

export const generateInvoice = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const sellerId = req.user._id;

        const quotation = await Quotation.findById(validatedData.quotationId);
        
        if (!quotation) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Quotation not found');
        }

        if(quotation.status!=='negotiation'){
            throw buildErrorObject(httpStatus.BAD_REQUEST , 'Quotation already processed')
        }

        if (quotation.seller.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You are not authorized to create invoice for this quotation');
        }

        const chat = await Chat.findOne({ quotation: validatedData.quotationId });
        
        if (!chat) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Chat not found for this quotation');
        }

        if (chat.phase !== 'negotiation') {
            throw buildErrorObject(httpStatus.BAD_REQUEST, `Cannot create invoice. Chat is in ${chat.phase} phase`);
        }

        if (chat.activeInvoice && chat.activeInvoice.invoice) {
            const existingInvoice = await Invoice.findById(chat.activeInvoice.invoice);
            if (existingInvoice && existingInvoice.status === 'pending') {
                throw buildErrorObject(httpStatus.CONFLICT, 'There is already an active invoice for this quotation');
            }
        }

      

        const totalAmount = validatedData.negotiatedPrice + (validatedData.taxAmount || 0) + (validatedData.shippingCharges || 0);

        const invoiceData = {
            ...validatedData,
            sellerId,
            chatId: chat._id,
            totalAmount: totalAmount
        };

        const invoice = await Invoice.create(invoiceData);

        await Chat.findByIdAndUpdate(chat._id, {
            phase: 'invoice_sent',
            activeInvoice: {
                invoice: invoice._id,
                status: 'pending',
                createdAt: new Date()
            }
        });

        await Message.create({
            senderId: sellerId,
            senderModel: 'Seller',
            content: `Invoice sent for ${validatedData.negotiatedPrice}`,
            chat: chat._id,
            quotationId: validatedData.quotationId,
            messageType: 'text',
            isRead: false
        });

        const token = generateInvoiceToken(invoice._id);
        const invoiceLink = `${process.env.INVOICE_FRONTEND_URL}/${token}`;

        res.status(httpStatus.CREATED).json(
            buildResponse(httpStatus.CREATED, {
                message: 'Invoice created successfully',
                invoiceId: invoice._id,
                invoiceLink: invoiceLink
            })
        );

    } catch (err) {
        handleError(res, err);
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
            validatedData.totalAmount = validatedData.negotiatedPrice + (validatedData.taxAmount || 0) + (validatedData.shippingCharges || 0);
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