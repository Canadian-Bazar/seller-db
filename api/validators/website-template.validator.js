import { check , query , param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateCreateWebsiteTemplate = [
  check('name')
    .exists({ checkFalsy: true })
    .withMessage('Template name is required')
    .isString()
    .withMessage('Template name must be a string')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Template name must be between 1 and 200 characters'),

  check('url')
    .exists({ checkFalsy: true })
    .withMessage('Template URL is required')
    .isURL()
    .withMessage('Template URL must be a valid URL'),

  check('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  (req, res, next) => validateRequest(req, res, next)
];

export const validateUpdateWebsiteTemplate = [
  param('id')
    .exists({ checkFalsy: true })
    .withMessage('Template ID is required')
    .isMongoId()
    .withMessage('Template ID must be a valid MongoDB ObjectId'),

  check('name')
    .optional()
    .isString()
    .withMessage('Template name must be a string')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Template name must be between 1 and 200 characters'),

  check('url')
    .optional()
    .isURL()
    .withMessage('Template URL must be a valid URL'),

  check('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  (req, res, next) => validateRequest(req, res, next)
];

export const validateGetWebsiteTemplate = [
  param('id')
    .exists({ checkFalsy: true })
    .withMessage('Template ID is required')
    .isMongoId()
    .withMessage('Template ID must be a valid MongoDB ObjectId'),

  (req, res, next) => validateRequest(req, res, next)
];

export const validateGetAllWebsiteTemplates = [
  check('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),

  check('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  check('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  (req, res, next) => validateRequest(req, res, next)
];