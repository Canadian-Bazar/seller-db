import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateSyncServiceCustomization = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('designImages')
        .exists({ checkFalsy: true })
        .withMessage('Design images are required')
        .isArray({ min: 1 })
        .withMessage('Design images must be a non-empty array'),

    check('designImages.*')
        .if(check('designImages').isArray({ min: 1 }))
        .isString()
        .withMessage('Each design image must be a string URL')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Each design image URL cannot be empty'),

    check('logo')
        .exists({ checkFalsy: true })
        .withMessage('Logo is required')
        .isString()
        .withMessage('Logo must be a string URL')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Logo URL cannot be empty'),

    check('colorChoices')
        .exists({ checkFalsy: true })
        .withMessage('Color choices are required')
        .isArray({ min: 1 })
        .withMessage('Color choices must be a non-empty array'),

    check('colorChoices.*')
        .if(check('colorChoices').isArray({ min: 1 }))
        .isString()
        .withMessage('Each color choice must be a string')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Each color choice must be between 1 and 50 characters'),

    check('rapidPrototype')
        .exists()
        .withMessage('Rapid prototype option is required')
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