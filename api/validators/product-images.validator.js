import { check, param } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';

export const validateSyncImages = [
  param('productId')
    .exists()
    .withMessage('Product ID is required')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid Mongo ID'),

  check('images')
    .optional()
    .isArray()
    .withMessage('Images should be an array')
    .customSanitizer((value) => {
      return Array.isArray(value)
        ? value.filter((img) => img && img.trim() !== '')
        : value;
    }),

  check('images.*')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Each image must be a non-empty string'),

  check('videos')
    .optional()
    .isArray()
    .withMessage('Videos should be an array')
    .customSanitizer((value) => {
      return Array.isArray(value)
        ? value.filter((v) => v && v.trim() !== '')
        : value;
    }),

  check('videos.*')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Each video must be a non-empty string'),



  check('brochure')
    .optional()
    .isString()
    .withMessage('Brochure must be a non-empty string URL') ,

  (req, res, next) => validateRequest(req, res, next),
];

export const validateGetImages = [
  param('productId')
    .exists()
    .withMessage('Product ID is required')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid Mongo ID'),

  (req, res, next) => validateRequest(req, res, next),
];
