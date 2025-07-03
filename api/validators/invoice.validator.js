import { check, query, param } from 'express-validator'
import validateRequest from '../utils/validateRequest.js'

// Generate invoice validator (seller)
export const generateInvoiceValidator = [
  check('quotationId')
    .exists()
    .withMessage('Quotation ID is required')
    .not()
    .isEmpty()
    .withMessage('Quotation ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid quotation ID format'),

  check('negotiatedPrice')
    .exists()
    .withMessage('Negotiated price is required')
    .not()
    .isEmpty()
    .withMessage('Negotiated price cannot be empty')
    .isNumeric()
    .withMessage('Negotiated price must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Negotiated price must be greater than 0'),

  check('paymentTerms')
    .optional()
    .isString()
    .withMessage('Payment terms must be a string')
    .isLength({ min: 3, max: 200 })
    .withMessage('Payment terms must be between 3 and 200 characters'),

  check('deliveryTerms')
    .optional()
    .isString()
    .withMessage('Delivery terms must be a string')
    .isLength({ min: 3, max: 200 })
    .withMessage('Delivery terms must be between 3 and 200 characters'),

  check('taxAmount')
    .optional()
    .isNumeric()
    .withMessage('Tax amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be 0 or greater'),

  check('shippingCharges')
    .optional()
    .isNumeric()
    .withMessage('Shipping charges must be a number')
    .isFloat({ min: 0 })
    .withMessage('Shipping charges must be 0 or greater'),

  check('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  (req, res, next) => validateRequest(req, res, next)
]

// Get invoice details validator (buyer)
export const getInvoiceDetailsValidator = [
  check('invoiceToken')
    .exists()
    .withMessage('Invoice token is required')
    .not()
    .isEmpty()
    .withMessage('Invoice token cannot be empty')
    .isString()
    .withMessage('Invoice token must be a string'),

  (req, res, next) => validateRequest(req, res, next)
]

// Accept invoice validator (buyer)
export const acceptInvoiceValidator = [
  check('invoiceToken')
    .exists()
    .withMessage('Invoice token is required')
    .not()
    .isEmpty()
    .withMessage('Invoice token cannot be empty')
    .isString()
    .withMessage('Invoice token must be a string'),

  (req, res, next) => validateRequest(req, res, next)
]

// Reject invoice validator (buyer)
export const rejectInvoiceValidator = [
  check('invoiceToken')
    .exists()
    .withMessage('Invoice token is required')
    .not()
    .isEmpty()
    .withMessage('Invoice token cannot be empty')
    .isString()
    .withMessage('Invoice token must be a string'),

  check('rejectionReason')
    .optional()
    .isString()
    .withMessage('Rejection reason must be a string')
    .isLength({ min: 3, max: 500 })
    .withMessage('Rejection reason must be between 3 and 500 characters'),

  (req, res, next) => validateRequest(req, res, next)
]

// Get seller invoices validator
export const getSellerInvoicesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected', 'expired'])
    .withMessage('Invalid invoice status'),

  (req, res, next) => validateRequest(req, res, next)
]

// Get invoice by ID validator (seller)
export const getInvoiceByIdValidator = [
  param('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid invoice ID format'),

  (req, res, next) => validateRequest(req, res, next)
]

// Update invoice validator (seller)
export const updateInvoiceValidator = [
  param('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid invoice ID format'),

  check('negotiatedPrice')
    .optional()
    .isNumeric()
    .withMessage('Negotiated price must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Negotiated price must be greater than 0'),

  check('paymentTerms')
    .optional()
    .isString()
    .withMessage('Payment terms must be a string')
    .isLength({ min: 3, max: 200 })
    .withMessage('Payment terms must be between 3 and 200 characters'),

  check('deliveryTerms')
    .optional()
    .isString()
    .withMessage('Delivery terms must be a string')
    .isLength({ min: 3, max: 200 })
    .withMessage('Delivery terms must be between 3 and 200 characters'),

  check('taxAmount')
    .optional()
    .isNumeric()
    .withMessage('Tax amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be 0 or greater'),

  check('shippingCharges')
    .optional()
    .isNumeric()
    .withMessage('Shipping charges must be a number')
    .isFloat({ min: 0 })
    .withMessage('Shipping charges must be 0 or greater'),

  check('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  (req, res, next) => validateRequest(req, res, next)
]

// Delete invoice validator (seller)
export const deleteInvoiceValidator = [
  param('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid invoice ID format'),

  (req, res, next) => validateRequest(req, res, next)
]