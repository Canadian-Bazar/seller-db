import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateSyncServicePricing = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('perModelPrice')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Per model price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Per model price cannot be negative');
            }
            return true;
        }),

    check('perHourPrice')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Per hour price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Per hour price cannot be negative');
            }
            return true;
        }),

    check('perBatchPrice')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Per batch price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Per batch price cannot be negative');
            }
            return true;
        }),

    check('volume')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Volume price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Volume price cannot be negative');
            }
            return true;
        }),

    check('customQuoteEnabled')
        .optional({ nullable: true })
        .isBoolean()
        .withMessage('Custom quote enabled must be a boolean value'),

    (req, res, next) => validateRequest(req, res, next)
];


export const validateGetServicePricing = [
    param('serviceId')
        .exists()
        .withMessage('Service ID is required')
        .notEmpty()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];