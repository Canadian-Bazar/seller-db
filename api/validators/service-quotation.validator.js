import { check, query, param } from 'express-validator'
import validateRequest from '../utils/validateRequest.js'

// Accept Service Quotation Validator
export const validateAcceptServiceQuotation = [
    check('quotationId')
        .exists().withMessage('Service quotation ID is required')
        .notEmpty().withMessage('Service quotation ID cannot be empty')
        .isString().withMessage('Service quotation ID must be a string')
        .isMongoId().withMessage('Service quotation ID must be a valid MongoDB ObjectId'),

    (req, res, next) => validateRequest(req, res, next)
]

// Reject Service Quotation Validator
export const validateRejectServiceQuotation = [
    check('quotationId')
        .exists().withMessage('Service quotation ID is required')
        .notEmpty().withMessage('Service quotation ID cannot be empty')
        .isString().withMessage('Service quotation ID must be a string')
        .isMongoId().withMessage('Service quotation ID must be a valid MongoDB ObjectId'),

    (req, res, next) => validateRequest(req, res, next)
]

// Negotiate Service Quotation Validator
export const validateNegotiateServiceQuotation = [
    check('quotationId')
        .exists().withMessage('Service quotation ID is required')
        .notEmpty().withMessage('Service quotation ID cannot be empty')
        .isString().withMessage('Service quotation ID must be a string')
        .isMongoId().withMessage('Service quotation ID must be a valid MongoDB ObjectId'),

    (req, res, next) => validateRequest(req, res, next)
]

// Get Service Quotations Validator
export const validateGetServiceQuotations = [
    query('status')
        .optional()
        .isString()
        .withMessage('Status must be a valid string')
        .isIn(['accepted', 'rejected', 'pending', 'negotiation'])
        .withMessage('Invalid service quotation status requested'),

    query('sortBy')
        .optional()
        .isString()
        .withMessage('Sort By should be a valid string')
        .isIn(['asc', 'desc'])
        .withMessage('Invalid sort by parameter'),

    query('serviceIds')
        .optional()
        .isArray()
        .withMessage('Service IDs should be an array')
        .isLength({ min: 1 })
        .withMessage('Service IDs should not be empty'),

    query('serviceIds.*')
        .isMongoId()
        .withMessage('Invalid service ID'),

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

// Get Service Quotation By ID Validator
export const validateGetServiceQuotationById = [
    param('quotationId')
        .exists()
        .withMessage('Service quotation ID is required')
        .notEmpty()
        .withMessage('Service quotation ID is required')
        .isMongoId()
        .withMessage('Invalid service quotation ID'),

    (req, res, next) => validateRequest(req, res, next)
]