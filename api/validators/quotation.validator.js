import { check, query, param } from 'express-validator'
import validateRequest from '../utils/validateRequest.js'

// Accept Quotation Validator
export const validateAcceptQuotation = [
    check('quotationId')
        .exists().withMessage('Quotation ID is required')
        .notEmpty().withMessage('Quotation ID cannot be empty')
        .isString().withMessage('Quotation ID must be a string')
        .isMongoId().withMessage('Quotation ID must be a valid MongoDB ObjectId'),

    (req, res, next) => validateRequest(req, res, next)
]

// Reject Quotation Validator
export const validateRejectQuotation = [
    check('quotationId')
        .exists().withMessage('Quotation ID is required')
        .notEmpty().withMessage('Quotation ID cannot be empty')
        .isString().withMessage('Quotation ID must be a string')
        .isMongoId().withMessage('Quotation ID must be a valid MongoDB ObjectId'),

    (req, res, next) => validateRequest(req, res, next)
]

// Negotiate Quotation Validator
export const validateNegotiateQuotation = [
    check('quotationId')
        .exists().withMessage('Quotation ID is required')
        .notEmpty().withMessage('Quotation ID cannot be empty')
        .isString().withMessage('Quotation ID must be a string')
        .isMongoId().withMessage('Quotation ID must be a valid MongoDB ObjectId'),

    (req, res, next) => validateRequest(req, res, next)
]

// Get Quotations Validator
export const validateGetQuotations = [
    query('status')
        .optional()
        .isString()
        .withMessage('Status must be a valid string')
        .isIn(['accepted', 'rejected', 'pending', 'negotiation'])
        .withMessage('Invalid quotation status requested'),

    query('sortBy')
        .optional()
        .isString()
        .withMessage('Sort By should be a valid string')
        .isIn(['asc', 'desc'])
        .withMessage('Invalid sort by parameter'),

    query('productIds')
        .optional()
        .isArray()
        .withMessage('Product IDs should be an array')
        .isLength({ min: 1 })
        .withMessage('Product IDs should not be empty'),

    query('productIds.*')
        .isMongoId()
        .withMessage('Invalid product ID'),

    query('seen')
        .optional()
        .isBoolean()
        .withMessage('Seen should be a boolean'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),

    (req, res, next) => validateRequest(req, res, next)
]

// Get Quotation By ID Validator
export const validateGetQuotationById = [
    param('quotationId')
        .exists()
        .withMessage('Quotation ID is required')
        .notEmpty()
        .withMessage('Quotation ID is required')
        .isMongoId()
        .withMessage('Invalid Quotation ID'),

    (req, res, next) => validateRequest(req, res, next)
]