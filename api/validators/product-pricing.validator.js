import { param, check } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateSyncProductPricing = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    // quantityPriceTiers is optional now
    check('quantityPriceTiers')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Quantity price tiers must be a non-empty array if provided'),

    check('quantityPriceTiers.*.min')
        .if(check('quantityPriceTiers').exists())
        .exists({ checkFalsy: true })
        .withMessage('Tier minimum quantity is required')
        .isInt({ min: 1 })
        .withMessage('Tier minimum must be at least 1'),

    check('quantityPriceTiers.*.max')
        .if(check('quantityPriceTiers').exists())
        .optional()
        .isInt({ min: 1 })
        .withMessage('Tier maximum must be at least 1')
        .custom((value, { req, path }) => {
            const tiers = req.body.quantityPriceTiers;
            if (!Array.isArray(tiers)) return true;

            const index = parseInt(path.match(/\[(\d+)\]/)[1]);
            const isLastElement = index === tiers.length - 1;

            if (!isLastElement && (value === undefined || value === null || value === '')) {
                throw new Error('Max quantity is required for all tiers except the last one');
            }
            return true;
        }),

    check('quantityPriceTiers.*.price')
        .if(check('quantityPriceTiers').exists())
        .exists({ checkFalsy: true })
        .withMessage('Tier price is required')
        .isNumeric()
        .withMessage('Tier price must be a number')
        .custom(value => {
            if (value < 0) {
                throw new Error('Tier price cannot be negative');
            }
            return true;
        }),

    check('quantityPriceTiers')
        .if(check('quantityPriceTiers').exists())
        .custom((tiers) => {
            for (let i = 0; i < tiers.length; i++) {
                const tier = tiers[i];

                if (tier.max && tier.min > tier.max) {
                    throw new Error(`Tier ${i + 1}: minimum quantity cannot be greater than maximum quantity`);
                }

                if (i < tiers.length - 1) {
                    const nextTier = tiers[i + 1];
                    if (tier.max && tier.max >= nextTier.min) {
                        throw new Error(`Tier ${i + 1} and ${i + 2}: overlapping quantity ranges`);
                    }
                }
            }
            return true;
        }),

    // leadTime is optional now
    check('leadTime')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Lead time must be a non-empty array if provided'),

    check('leadTime.*.min')
        .if(check('leadTime').exists())
        .exists({ checkFalsy: true })
        .withMessage('Lead time minimum is required')
        .isInt({ min: 1 })
        .withMessage('Lead time minimum must be at least 1'),

    check('leadTime.*.max')
        .if(check('leadTime').exists())
        .optional()
        .isInt({ min: 1 })
        .withMessage('Lead time maximum must be at least 1')
        .custom((value, { req, path }) => {
            const leadTimes = req.body.leadTime;
            if (!Array.isArray(leadTimes)) return true;

            const index = parseInt(path.match(/\[(\d+)\]/)[1]);
            const isLastElement = index === leadTimes.length - 1;

            if (!isLastElement && (value === undefined || value === null || value === '')) {
                throw new Error('Max lead time is required for all ranges except the last one');
            }
            return true;
        }),

    check('leadTime.*.days')
        .if(check('leadTime').exists())
        .exists({ checkFalsy: true })
        .withMessage('Lead time days is required')
        .isInt({ min: 1 })
        .withMessage('Lead time days must be at least 1'),

    check('leadTime')
        .if(check('leadTime').exists())
        .custom((leadTimes) => {
            for (let i = 0; i < leadTimes.length; i++) {
                const leadTime = leadTimes[i];

                if (leadTime.max && leadTime.min > leadTime.max) {
                    throw new Error(`Lead time ${i + 1}: minimum cannot be greater than maximum`);
                }

                if (i < leadTimes.length - 1) {
                    const nextLeadTime = leadTimes[i + 1];
                    if (leadTime.max && leadTime.max >= nextLeadTime.min) {
                        throw new Error(`Lead time ${i + 1} and ${i + 2}: overlapping ranges`);
                    }
                }
            }
            return true;
        }),

    check('minPrice')
        .exists()
        .withMessage('Please provide a minimum price for negotiation')
        .notEmpty()
        .withMessage('Please provide a minimum price for negotiation')
        .isNumeric()
        .withMessage('Minimum price must be a number'),

    check('maxPrice')
        .exists()
        .withMessage('Please provide a maximum price for negotiation')
        .notEmpty()
        .withMessage('Please provide a maximum price for negotiation')
        .isNumeric()
        .withMessage('Maximum price must be a number')
        .custom((value, { req }) => {
            if (req.body.minPrice !== undefined && Number(value) < Number(req.body.minPrice)) {
                throw new Error('Maximum price must be greater than or equal to minimum price');
            }
            return true;
        }),

    (req, res, next) => validateRequest(req, res, next)
];



export const validateGetProductPricing = [
    param('productId')
        .exists()
        .withMessage('Product ID is required')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];