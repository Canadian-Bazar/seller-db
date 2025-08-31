import { check, query, param } from 'express-validator'
import validateRequest from '../utils/validateRequest.js'

// Generate service invoice validator (seller)
export const generateServiceInvoiceValidator = [
  check('quotationId')
    .exists()
    .withMessage('Service quotation ID is required')
    .not()
    .isEmpty()
    .withMessage('Service quotation ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid service quotation ID format'),

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


  

  

  (req, res, next) => validateRequest(req, res, next)
]

// Get service invoice details validator
export const getServiceInvoiceDetailsValidator = [
  check('invoiceToken')
    .exists()
    .withMessage('Service invoice token is required')
    .not()
    .isEmpty()
    .withMessage('Service invoice token cannot be empty')
    .isString()
    .withMessage('Service invoice token must be a string'),

  (req, res, next) => validateRequest(req, res, next)
]

// Get seller service invoices validator
export const getSellerServiceInvoicesValidator = [
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
    .withMessage('Invalid service invoice status'),

  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search must be between 1 and 100 characters'),

  (req, res, next) => validateRequest(req, res, next)
]

// Get service invoice by ID validator (seller)
export const getServiceInvoiceByIdValidator = [
  param('serviceInvoiceId')
    .exists()
    .withMessage('Service invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Service invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid service invoice ID format'),

  (req, res, next) => validateRequest(req, res, next)
]

// Update service invoice validator (seller)
export const updateServiceInvoiceValidator = [
  param('serviceInvoiceId')
    .exists()
    .withMessage('Service invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Service invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid service invoice ID format'),

  check('totalAmount')
    .optional()
    .isNumeric()
    .withMessage('Total amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be greater than 0'),

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

  check('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  check('serviceDetails')
    .optional()
    .isArray()
    .withMessage('Service details must be an array'),

  (req, res, next) => validateRequest(req, res, next)
]

// Delete service invoice validator (seller)
export const deleteServiceInvoiceValidator = [
  param('serviceInvoiceId')
    .exists()
    .withMessage('Service invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Service invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid service invoice ID format'),

  (req, res, next) => validateRequest(req, res, next)
]