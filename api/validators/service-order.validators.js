import { check, param, query } from "express-validator";
import validateRequest from "../utils/validateRequest.js";
import { paginationValidator } from './pagination.validator.js';

export const getServiceOrderByIdValidator = [
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

export const updateServiceOrderStatusValidator = [
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
            'in_progress',
            'review_ready',
            'revision_requested',
            'completed',
            'delivered',
            'cancelled'
        ])
        .withMessage('Invalid service order status'),

    (req, res, next) => validateRequest(req, res, next)
]

export const getServiceOrdersValidator = [
    ...paginationValidator,

    query('status')
        .optional()
        .isIn([
            'pending',
            'confirmed', 
            'in_progress',
            'review_ready',
            'revision_requested',
            'completed',
            'delivered',
            'cancelled'
        ])
        .withMessage('Invalid service order status'),

    query('search')
        .optional()
        .isString()
        .withMessage('Search must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Search must be between 1 and 100 characters'),

    (req, res, next) => validateRequest(req, res, next)
]

export const addServiceOrderDeliverableValidator = [
    param('orderId')
        .exists()
        .withMessage('Order ID is required')
        .not()
        .isEmpty()
        .withMessage('Order ID cannot be empty')
        .isString()
        .withMessage('Order ID must be a string'),

    check('name')
        .exists()
        .withMessage('Deliverable name is required')
        .not()
        .isEmpty()
        .withMessage('Deliverable name cannot be empty')
        .isString()
        .withMessage('Deliverable name must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Deliverable name must be between 1 and 100 characters'),

    check('description')
        .optional()
        .isString()
        .withMessage('Deliverable description must be a string')
        .isLength({ max: 500 })
        .withMessage('Deliverable description cannot exceed 500 characters'),

    check('fileUrl')
        .exists()
        .withMessage('File URL is required')
        .not()
        .isEmpty()
        .withMessage('File URL cannot be empty')
        .isURL()
        .withMessage('File URL must be a valid URL'),

    (req, res, next) => validateRequest(req, res, next)
]

export const updateServiceOrderMilestoneValidator = [
    param('orderId')
        .exists()
        .withMessage('Order ID is required')
        .not()
        .isEmpty()
        .withMessage('Order ID cannot be empty')
        .isString()
        .withMessage('Order ID must be a string'),

    check('milestoneId')
        .exists()
        .withMessage('Milestone ID is required')
        .not()
        .isEmpty()
        .withMessage('Milestone ID cannot be empty')
        .isMongoId()
        .withMessage('Milestone ID must be a valid MongoDB ID'),

    check('status')
        .exists()
        .withMessage('Status is required')
        .not()
        .isEmpty()
        .withMessage('Status cannot be empty')
        .isIn(['pending', 'in_progress', 'completed'])
        .withMessage('Invalid milestone status'),

    (req, res, next) => validateRequest(req, res, next)
]

export const validateSyncServiceOrder = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('moq')
        .optional()
        .isInt({ min: 1 })
        .withMessage('MOQ must be a number greater than or equal to 1'),

    check('standardLeadTime')
        .exists({ checkFalsy: true })
        .withMessage('Standard lead time is required')
        .isObject()
        .withMessage('Standard lead time must be an object'),

    check('standardLeadTime.time')
        .exists({ checkFalsy: true })
        .withMessage('Standard lead time value is required')
        .isNumeric()
        .withMessage('Standard lead time must be a number')
        .custom(value => {
            if (value <= 0) {
                throw new Error('Standard lead time must be greater than 0');
            }
            return true;
        }),

    check('standardLeadTime.unit')
        .exists({ checkFalsy: true })
        .withMessage('Standard lead time unit is required')
        .isString()
        .withMessage('Standard lead time unit must be a string')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Standard lead time unit must be between 1 and 50 characters'),

    check('rushOptions')
        .optional()
        .isArray()
        .withMessage('Rush options must be an array'),

    check('rushOptions.*.min')
        .if(check('rushOptions').isArray({ min: 1 }))
        .exists({ checkFalsy: true })
        .withMessage('Rush option minimum is required')
        .isInt({ min: 1 })
        .withMessage('Rush option minimum must be at least 1'),

    check('rushOptions.*.max')
        .if(check('rushOptions').isArray({ min: 1 }))
        .optional()
        .isInt({ min: 1 })
        .withMessage('Rush option maximum must be at least 1')
        .custom((value, { req, path }) => {
            const rushOptions = req.body.rushOptions;
            if (!Array.isArray(rushOptions)) return true;

            const index = parseInt(path.match(/\[(\d+)\]/)[1]);
            const isLastElement = index === rushOptions.length - 1;

            if (!isLastElement && (value === undefined || value === null || value === '')) {
                throw new Error('Max quantity is required for all rush options except the last one');
            }

            return true;
        }),

    check('rushOptions.*.days')
        .if(check('rushOptions').isArray({ min: 1 }))
        .exists({ checkFalsy: true })
        .withMessage('Rush option days is required')
        .isInt({ min: 1 })
        .withMessage('Rush option days must be at least 1'),

    check('rushOptions')
        .if(check('rushOptions').isArray({ min: 1 }))
        .custom((rushOptions) => {
            for (let i = 0; i < rushOptions.length; i++) {
                const option = rushOptions[i];

                if (option.max && option.min > option.max) {
                    throw new Error(`Rush option ${i + 1}: minimum cannot be greater than maximum`);
                }

                if (i < rushOptions.length - 1) {
                    const nextOption = rushOptions[i + 1];
                    if (option.max && option.max >= nextOption.min) {
                        throw new Error(`Rush option ${i + 1} and ${i + 2}: overlapping ranges`);
                    }
                }
            }
            return true;
        }),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetServiceOrder = [
    param('serviceId')
        .exists()
        .withMessage('Service ID is required')
        .notEmpty()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];
