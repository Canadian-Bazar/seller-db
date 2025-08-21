import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateSyncServiceCustomization = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('designImages')
        .optional()
        .isArray()
        .withMessage('Design images must be an array'),

    check('designImages.*')
        .optional()
        .isString()
        .withMessage('Each design image must be a string URL')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Each design image URL cannot be empty'),

check('logo')
  .optional({ nullable: true }) 
  .isString()
  .withMessage('Logo must be a string URL')
  .trim()
  .isLength({ min: 1 })
  .withMessage('Logo URL cannot be empty'),


    check('colorChoices')
        .optional()
        .isArray()
        .withMessage('Color choices must be an array'),

    check('colorChoices.*')
        .optional()
        .isString()
        .withMessage('Each color choice must be a string')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Each color choice must be between 1 and 50 characters'),

    check('rapidPrototype')
        .optional()
        .isBoolean()
        .withMessage('Rapid prototype must be a boolean value'),

    (req, res, next) => validateRequest(req, res, next)
];


export const validateGetServiceCustomization = [
    param('serviceId')
        .exists()
        .withMessage('Service ID is required')
        .notEmpty()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];