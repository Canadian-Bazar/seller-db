import { check, query, param } from 'express-validator'
import validateRequest from '../utils/validateRequest.js'
import { paginationValidator } from './pagination.validator.js';

export const getOrderByIdValidator = [
  param('orderId')
    .exists()
    .withMessage('Order ID is required')
    .not()
    .isEmpty()
    .withMessage('Order ID cannot be empty')
    .isString()
    .withMessage('Order ID must be a string'),

  (req, res, next) => validateRequest(req, res, next)
]

export const updateOrderStatusValidator = [
  param('orderId')
    .exists()
    .withMessage('Order ID is required')
    .not()
    .isEmpty()
    .withMessage('Order ID cannot be empty')
    .isString()
    .withMessage('Order ID must be a string'),

  check('status')
    .exists()
    .withMessage('Status is required')
    .not()
    .isEmpty()
    .withMessage('Status cannot be empty')
    .isIn([
      'pending', 
      'confirmed', 
      'processing', 
      'ready_to_ship', 
      'shipped', 
      'in_transit', 
      'out_for_delivery', 
      'delivered', 
      'cancelled', 
      'returned'
    ])
    .withMessage('Invalid order status'),

  check('trackingNumber')
    .optional()
    .isString()
    .withMessage('Tracking number must be a string')
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking number must be between 3 and 50 characters'),

  check('estimatedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Estimated delivery date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Estimated delivery date must be in the future');
      }
      return true;
    }),

  (req, res, next) => validateRequest(req, res, next)
]

export const getBuyerOrdersValidator = [
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
    .isIn([
      'pending', 
      'confirmed', 
      'processing', 
      'ready_to_ship', 
      'shipped', 
      'in_transit', 
      'out_for_delivery', 
      'delivered', 
      'cancelled', 
      'returned'
    ])
    .withMessage('Invalid order status'),

  (req, res, next) => validateRequest(req, res, next)
]

export const getSellerOrdersValidator = [
...paginationValidator ,

  query('status')
    .optional()
    .isIn([
      'pending', 
      'confirmed', 
      'processing', 
      'ready_to_ship', 
      'shipped', 
      'in_transit', 
      'out_for_delivery', 
      'delivered', 
      'cancelled', 
      'returned'
    ])
    .withMessage('Invalid order status'),

  (req, res, next) => validateRequest(req, res, next)
]

export const cancelOrderValidator = [
  param('orderId')
    .exists()
    .withMessage('Order ID is required')
    .not()
    .isEmpty()
    .withMessage('Order ID cannot be empty')
    .isString()
    .withMessage('Order ID must be a string'),

  check('cancellationReason')
    .optional()
    .isString()
    .withMessage('Cancellation reason must be a string')
    .isLength({ min: 3, max: 500 })
    .withMessage('Cancellation reason must be between 3 and 500 characters'),

  (req, res, next) => validateRequest(req, res, next)
]