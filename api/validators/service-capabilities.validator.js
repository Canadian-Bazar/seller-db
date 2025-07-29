import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateSyncServiceCapabilities = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('processType')
        .exists({ checkFalsy: true })
        .withMessage('Process type is required')
        .isString()
        .withMessage('Process type must be a string')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Process type must be between 1 and 200 characters'),

    check('materialsSupported')
        .exists({ checkFalsy: true })
        .withMessage('Materials supported is required')
        .isArray({ min: 1 })
        .withMessage('Materials supported must be a non-empty array'),

    check('materialsSupported.*')
        .if(check('materialsSupported').isArray({ min: 1 }))
        .isString()
        .withMessage('Each material must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each material must be between 1 and 100 characters'),

    check('surfaceFinishAndCoatings')
        .exists({ checkFalsy: true })
        .withMessage('Surface finish and coatings is required')
        .isArray({ min: 1 })
        .withMessage('Surface finish and coatings must be a non-empty array'),

    check('surfaceFinishAndCoatings.*')
        .if(check('surfaceFinishAndCoatings').isArray({ min: 1 }))
        .isString()
        .withMessage('Each surface finish must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each surface finish must be between 1 and 100 characters'),

    check('tolerance')
        .exists({ checkFalsy: true })
        .withMessage('Tolerance is required')
        .isNumeric()
        .withMessage('Tolerance must be a number')
        .custom(value => {
            if (value <= 0) {
                throw new Error('Tolerance must be greater than 0');
            }
            return true;
        }),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetServiceCapabilities = [
    param('serviceId')
        .exists()
        .withMessage('Service ID is required')
        .notEmpty()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];