import { check } from 'express-validator';
import validateRequest from '../../../buyer-db/api/utils/validateRequest.js';

export const generateInvoiceValidator = [
  check('quotationId')
    .exists()
    .withMessage('Quotation ID is required')
    .not()
    .isEmpty()
    .withMessage('Quotation ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid Quotation ID'),

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

  (req, res, next) => validateRequest(req, res, next),
];

export const getSellerInvoicesValidator = [
  check('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  check('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  check('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected'])
    .withMessage('Status must be pending, accepted, or rejected'),

  (req, res, next) => validateRequest(req, res, next),
];

export const getInvoiceByIdValidator = [
  check('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid Invoice ID'),

  (req, res, next) => validateRequest(req, res, next),
];

export const updateInvoiceValidator = [
  check('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid Invoice ID'),

  check('negotiatedPrice')
    .optional()
    .isNumeric()
    .withMessage('Negotiated price must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Negotiated price must be greater than 0'),

  check('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiration date format'),

  (req, res, next) => validateRequest(req, res, next),
];

export const deleteInvoiceValidator = [
  check('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .not()
    .isEmpty()
    .withMessage('Invoice ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid Invoice ID'),

  (req, res, next) => validateRequest(req, res, next),
];