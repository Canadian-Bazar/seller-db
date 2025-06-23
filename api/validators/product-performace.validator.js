import { check } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';



export const validateProductAnalytics = [
  check('products')
    .exists()
    .withMessage('Products array is required')
    .isArray()
    .withMessage('Products must be an array'),

  check('products.*')
    .if(check('products').isArray({ min: 1 }))
    .isMongoId()
    .withMessage('Each product ID must be a valid MongoDB ObjectId'),

  check('from')
    .exists()
    .withMessage('From date is required')
    .not()
    .isEmpty()
    .withMessage('From date cannot be empty')
    .isISO8601()
    .withMessage('From date must be a valid date (YYYY-MM-DD)'),

  check('to')
    .exists()
    .withMessage('To date is required')
    .not()
    .isEmpty()
    .withMessage('To date cannot be empty')
    .isISO8601()
    .withMessage('To date must be a valid date (YYYY-MM-DD)'),

  check('granularity')
    .exists()
    .withMessage('Granularity is required')
    .not()
    .isEmpty()
    .withMessage('Granularity cannot be empty')
    .isIn(['days', 'weeks', 'months', 'years'])
    .withMessage('Granularity must be one of: days, weeks, months, years'),

    check('type')
    .optional()
    .notEmpty()
    .withMessage('Type cannot be empty if provided')
    .isString()
    .withMessage('Type must be a string')
    .trim()
    .isIn(['bestsellerScore', 'popularityScore', 'quotationsSent' , 'quotationsAccepted' , 'quotationsRejected' , 'quotationsInProgress'])
    .withMessage('Invalid Type'),


  (req, res, next) => validateRequest(req, res, next),
];


export const validateProductSummary=[


    check('products')
    .exists()
    .withMessage('Products array is required')
    .isArray()
    .withMessage('Products must be an array'),

  check('products.*')
    .if(check('products').isArray({ min: 1 }))
    .isMongoId()
    .withMessage('Each product ID must be a valid MongoDB ObjectId'),

  check('from')
    .exists()
    .withMessage('From date is required')
    .not()
    .isEmpty()
    .withMessage('From date cannot be empty')
    .isISO8601()
    .withMessage('From date must be a valid date (YYYY-MM-DD)'),

  check('to')
    .exists()
    .withMessage('To date is required')
    .not()
    .isEmpty()
    .withMessage('To date cannot be empty')
    .isISO8601()
    .withMessage('To date must be a valid date (YYYY-MM-DD)'),


    (req , res , next) => validateRequest(req, res, next),

]