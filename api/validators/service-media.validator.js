import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateSyncServiceMedia = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('images')
        .exists({ checkFalsy: true })
        .withMessage('Images are required')
        .isArray({ min: 1 })
        .withMessage('Images must be a non-empty array'),

    check('images.*')
        .if(check('images').isArray({ min: 1 }))
        .isString()
        .withMessage('Each image must be a string URL')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Each image URL cannot be empty'),

    check('videos')
        .exists({ checkFalsy: true })
        .withMessage('Videos are required')
        .isArray({ min: 1 })
        .withMessage('Videos must be a non-empty array'),

    check('videos.*')
        .if(check('videos').isArray({ min: 1 }))
        .isString()
        .withMessage('Each video must be a string URL')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Each video URL cannot be empty'),

    check('warranty')
        .exists({ checkFalsy: true })
        .withMessage('Warranty information is required')
        .isObject()
        .withMessage('Warranty must be an object'),

    check('warranty.duration')
        .exists({ checkFalsy: true })
        .withMessage('Warranty duration is required')
        .isNumeric()
        .withMessage('Warranty duration must be a number')
        .custom(value => {
            if (value <= 0) {
                throw new Error('Warranty duration must be greater than 0');
            }
            return true;
        }),

    check('warranty.unit')
        .exists({ checkFalsy: true })
        .withMessage('Warranty unit is required')
        .isString()
        .withMessage('Warranty unit must be a string')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Warranty unit must be between 1 and 50 characters'),

    check('industryCertifications')
        .exists({ checkFalsy: true })
        .withMessage('Industry certifications are required')
        .isArray({ min: 1 })
        .withMessage('Industry certifications must be a non-empty array'),

    check('industryCertifications.*')
        .if(check('industryCertifications').isArray({ min: 1 }))
        .isString()
        .withMessage('Each certification must be a string')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Each certification must be between 1 and 200 characters'),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetServiceMedia = [
    param('serviceId')
        .exists()
        .withMessage('Service ID is required')
        .notEmpty()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];