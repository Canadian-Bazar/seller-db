import express from 'express'
import { check , query , param } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';
import { paginationValidator } from './pagination.validator.js';


export const validateCreateWebsiteDocumentation = [
    check('documentation')
       .exists()
       .notEmpty()
       .withMessage('Documentation is required')
       .isString()
       .withMessage('Documentation must be a string') ,

    check('websiteQuotationId')
        .exists({ checkFalsy: true })
        .withMessage('Website quotation ID is required')
        .isMongoId()
        .withMessage('Website quotation ID must be a valid MongoDB ObjectId'),

    check('pricingPlans')
        .exists({ checkFalsy: true })
        .withMessage('Pricing plans are required')
        .custom((value) => {
            if (!value) return false;
            
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                if (!Array.isArray(parsed) || parsed.length === 0) {
                    throw new Error('Pricing plans must be a non-empty array');
                }
                return true;
            } catch (e) {
                throw new Error('Pricing plans must be valid JSON array');
            }
        }),

    check('pricingPlans')
        .customSanitizer((value) => {
            if (!value) return undefined;
            try {
                return typeof value === 'string' ? JSON.parse(value) : value;
            } catch (e) {
                return undefined;
            }
        }),

    check('pricingPlans.*.planName')
        .exists({ checkFalsy: true })
        .withMessage('Plan name is required')
        .isString()
        .withMessage('Plan name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Plan name must be between 1 and 100 characters'),

    check('pricingPlans.*.subscriptionPlanVersionId')
        .optional()
        .isMongoId()
        .withMessage('Subscription plan version ID must be a valid MongoDB ObjectId'),

    check('pricingPlans.*.sitePrice')
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

    check('pricingPlans')
        .custom((pricingPlans) => {
            if (!pricingPlans || pricingPlans.length === 0) return true;

            const planNames = pricingPlans.map(plan => plan.planName?.trim().toLowerCase()).filter(Boolean);
            const uniquePlanNames = [...new Set(planNames)];
            
            if (planNames.length !== uniquePlanNames.length) {
                throw new Error('Duplicate plan names are not allowed');
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

export const getAllWebsiteDocumentationsValidator = [
    ...paginationValidator,
    
    check('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected'])
        .withMessage('Invalid status'),

    (req, res, next) => validateRequest(req, res, next)
];

export const getWebsiteDocumentationByIdValidator = [
    param('id')
        .exists({ checkFalsy: true })
        .withMessage('Documentation ID is required')
        .isMongoId()
        .withMessage('Documentation ID must be a valid MongoDB ObjectId'),

    (req, res, next) => validateRequest(req, res, next)
];