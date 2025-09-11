import { check, body } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';

export const validateServiceAnalytics = [
  check('services')
    .exists()
    .withMessage('Services array is required')
    .isArray()
    .withMessage('Services must be an array'),

  check('services.*')
    .if(check('services').isArray({ min: 1 }))
    .isMongoId()
    .withMessage('Each service ID must be a valid MongoDB ObjectId'),

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
    .isIn(['salesAmount', 'salesCount', 'profit', 'avgRating', 'completionRate'])
    .withMessage('Type must be one of: salesAmount, salesCount, profit, avgRating, completionRate'),

  (req, res, next) => validateRequest(req, res, next),
];

export const validateServicePerformanceAnalytics = [
  check('services')
    .exists()
    .withMessage('Services array is required')
    .isArray()
    .withMessage('Services must be an array'),

  check('services.*')
    .if(check('services').isArray({ min: 1 }))
    .isMongoId()
    .withMessage('Each service ID must be a valid MongoDB ObjectId'),

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
    .isIn(['viewCount', 'quotationsSent', 'quotationsAccepted', 'quotationsRejected', 'quotationsInProgress', 'popularityScore', 'responseTime'])
    .withMessage('Type must be one of: viewCount, quotationsSent, quotationsAccepted, quotationsRejected, quotationsInProgress, popularityScore, responseTime'),

  (req, res, next) => validateRequest(req, res, next),
];

export const validateServiceAnalyticsSummary = [
  check('services')
    .exists()
    .withMessage('Services array is required')
    .isArray()
    .withMessage('Services must be an array'),

  check('services.*')
    .if(check('services').isArray({ min: 1 }))
    .isMongoId()
    .withMessage('Each service ID must be a valid MongoDB ObjectId'),

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
    .optional()
    .isIn(['days', 'weeks', 'months', 'years'])
    .withMessage('Granularity must be one of: days, weeks, months, years'),

  (req, res, next) => validateRequest(req, res, next),
];