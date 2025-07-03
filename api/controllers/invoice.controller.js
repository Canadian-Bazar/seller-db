import Invoice from '../models/invoice.schema.js';
import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import Quotation from '../models/quotations.schema.js'

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

        if (quotation.seller.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You are not authorized to create invoice for this quotation');
        }

    

        const existingInvoice = await Invoice.findOne({ quotationId: validatedData.quotationId });
        
        if (existingInvoice) {
            throw buildErrorObject(httpStatus.CONFLICT, 'Invoice already exists for this quotation');
        }

        if (validatedData.negotiatedPrice > quotation.totalAmount) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Negotiated price cannot exceed original quotation amount');
        }

        const invoiceData = {
            ...validatedData,
            sellerId
        };

        const invoice = await Invoice.create(invoiceData);
        const token = generateInvoiceToken(invoice._id);
        const invoiceLink = `${process.env.INVOICE_FRONTEND_URL}/${token}`;

        res.status(httpStatus.CREATED).json(
            buildResponse(httpStatus.CREATED, 
                invoiceLink
            )
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
            .populate('buyerId', 'name email');

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

        await Invoice.findByIdAndDelete(invoiceId);

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, { message: 'Invoice deleted successfully' })
        );

    } catch (err) {
        handleError(res, err);
    }
};