import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";
import buildErrorObject from "../utils/buildErrorObject.js";
import { paginationValidator } from "./pagination.validator.js";

export const validateCreateWebsiteQuotation = [
    check('category')
        .exists({ checkFalsy: true })
        .withMessage('Category is required')
        .isMongoId()
        .withMessage('Category must be a valid MongoDB ObjectId'),

    check('itemsSold')
        .exists({ checkFalsy: true })
        .withMessage('Items sold is required')
        .isString()
        .withMessage('Items sold must be a string')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Items sold must be between 1 and 1000 characters'),

    check('domainName')
        .exists({ checkFalsy: true })
        .withMessage('Domain name is required')
        .isString()
        .withMessage('Domain name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Domain name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
        .withMessage('Domain name must be a valid domain format'),

    check('websiteUrl')
        .optional()
        .isURL()
        .withMessage('Website URL must be a valid URL'),

    check('referenceurl')
        .optional()
        .isURL()
        .withMessage('Reference URL must be a valid URL'),

    check('referenceWebTemplates')
        .optional()
        .isArray()
        .withMessage('References must be an array'),

    check('referenceWebTemplates.*')
        .if(check('referenceWebTemplates').isArray())
        .isMongoId()
        .withMessage('Each reference should be a valid MongoID'),

    check('additionalDetails')
        .optional()
        .isString()
        .withMessage('Additional details must be a string')
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Additional details cannot exceed 2000 characters'),

    (req, res, next) => validateRequest(req, res, next)
];





export const validateCreateWebsiteDocumentation = [
    check('documentationFile')
        .custom((value, { req }) => {
            if (!req.file && !value) {
                throw new Error('Documentation file is required');
            }
            return true;
        }),

    check('websiteQuotationId')
        .exists({ checkFalsy: true })
        .withMessage('Website quotation ID is required')
        .isMongoId()
        .withMessage('Website quotation ID must be a valid MongoDB ObjectId'),

    check('pricingPlans')
        .optional()
        .custom((value) => {
            if (!value) return true;
            
            try {
                const parsed = JSON.parse(value);
                if (!Array.isArray(parsed)) {
                    throw new Error('Pricing plans must be an array');
                }
                return true;
            } catch (e) {
                throw new Error('Pricing plans must be valid JSON array');
            }
        }),

    check('pricingPlans')
        .optional()
        .customSanitizer((value) => {
            if (!value) return undefined;
            try {
                return JSON.parse(value);
            } catch (e) {
                return undefined;
            }
        }),

    check('pricingPlans.*.planName')
        .if(check('pricingPlans').isArray())
        .exists({ checkFalsy: true })
        .withMessage('Plan name is required')
        .isString()
        .withMessage('Plan name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Plan name must be between 1 and 100 characters'),

    check('pricingPlans.*.subscriptionPlanVersionId')
        .if(check('pricingPlans').isArray())
        .optional()
        .isMongoId()
        .withMessage('Subscription plan version ID must be a valid MongoDB ObjectId'),

    check('pricingPlans.*.subscriptionPrice')
        .if(check('pricingPlans').isArray())
        .optional()
        .isNumeric()
        .withMessage('Subscription price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Subscription price cannot be negative');
            }
            return true;
        }),

    check('pricingPlans.*.sitePrice')
        .if(check('pricingPlans').isArray())
        .exists({ checkFalsy: true })
        .withMessage('Site price is required')
        .isNumeric()
        .withMessage('Site price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Site price cannot be negative');
            }
            return true;
        }),

    check('pricingPlans.*.totalPrice')
        .if(check('pricingPlans').isArray())
        .optional()
        .isNumeric()
        .withMessage('Total price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Total price cannot be negative');
            }
            return true;
        }),

    check('pricingPlans.*.isActive')
        .if(check('pricingPlans').isArray())
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),

    check('pricingPlans')
        .if(check('pricingPlans').isArray())
        .custom((pricingPlans) => {
            if (!pricingPlans || pricingPlans.length === 0) return true;

            const planNames = pricingPlans.map(plan => plan.planName?.trim().toLowerCase()).filter(Boolean);
            const uniquePlanNames = [...new Set(planNames)];
            
            if (planNames.length !== uniquePlanNames.length) {
                throw new Error('Duplicate plan names are not allowed');
            }

            for (let i = 0; i < pricingPlans.length; i++) {
                const plan = pricingPlans[i];
                if (plan.totalPrice !== undefined) {
                    const calculatedTotal = Number(plan.sitePrice || 0) + Number(plan.subscriptionPrice || 0);
                    if (plan.totalPrice < calculatedTotal) {

                        // throw buildErrorObject(htt)
                        // throw new Error(`Total price for plan "${plan.planName}" cannot be less than the sum of site price and subscription price`);
                    }
                }
            }

            return true;
        }),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetWebsiteDocumentation = [
    check('token')
        .exists({ checkFalsy: true })
        .withMessage('Token is required')
        .isString()
        .withMessage('Token must be a string')
        .trim()
        .isLength({ min: 10 })
        .withMessage('Token format is invalid'),

    (req, res, next) => validateRequest(req, res, next)
];



export const getWebsiteQuotations = [
    ...paginationValidator ,
    (req , res, next) =>validateRequest(req , res, next)
]


export const getWebsiteQuotationsById = [
    param('id')
    .exists({ checkFalsy: true })
    .withMessage('ID is required')
    .isMongoId()
    .withMessage('ID must be a valid MongoDB ObjectId') ,

    (req ,res , next) =>validateRequest(req , res, next)
]

export const editWebsiteQuotationValidator = [
    param('id')
        .exists({ checkFalsy: true })
        .withMessage('ID is required')
        .isMongoId()
        .withMessage('ID must be a valid MongoDB ObjectId'),

    check('category')
        .optional()
        .isMongoId()
        .withMessage('Category must be a valid MongoDB ObjectId'),

    check('itemsSold')
        .optional()
        .isString()
        .withMessage('Items sold must be a string')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Items sold must be between 1 and 1000 characters'),

    check('domainName')
        .optional()
        .isString()
        .withMessage('Domain name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Domain name must be between 1 and 100 characters'),

    check('websiteUrl')
        .optional({ nullable: true })
        .isURL()
        .withMessage('Website URL must be a valid URL'),

    check('referenceurl')
        .optional({ nullable: true })
        .isURL()
        .withMessage('Reference URL must be a valid URL'),

    check('referenceWebTemplates')
        .optional({ nullable: true })
        .isArray()
        .withMessage('References must be an array'),

    check('referenceWebTemplates.*')
        .if(check('referenceWebTemplates').isArray())
        .isMongoId()
        .withMessage('Each reference should be a valid MongoID'),

    check('additionalDetails')
        .optional({ nullable: true })
        .isString()
        .withMessage('Additional details must be a string')
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Additional details cannot exceed 2000 characters'),

    (req, res, next) => validateRequest(req, res, next)
]

export const acceptWebsiteQuotationValidator = [
    check('quotationId')
        .exists({ checkFalsy: true })
        .withMessage('Quotation ID is required')
        .isMongoId()
        .withMessage('Quotation ID must be a valid MongoDB ObjectId'),

    check('message')
        .optional()
        .isString()
        .withMessage('Message must be a string')
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Message cannot exceed 1000 characters'),

    (req, res, next) => validateRequest(req, res, next)
]

export const rejectWebsiteQuotationValidator = [
    check('quotationId')
        .exists({ checkFalsy: true })
        .withMessage('Quotation ID is required')
        .isMongoId()
        .withMessage('Quotation ID must be a valid MongoDB ObjectId'),

    check('rejectionReason')
        .exists({ checkFalsy: true })
        .withMessage('Rejection reason is required')
        .isString()
        .withMessage('Rejection reason must be a string')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Rejection reason must be between 10 and 500 characters'),

    check('message')
        .optional()
        .isString()
        .withMessage('Message must be a string')
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Message cannot exceed 1000 characters'),

    (req, res, next) => validateRequest(req, res, next)
]

export const getWebsiteQuotationsForAdmin = [
    ...paginationValidator,
    
    check('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected'])
        .withMessage('Invalid status'),

    (req, res, next) => validateRequest(req, res, next)
]

