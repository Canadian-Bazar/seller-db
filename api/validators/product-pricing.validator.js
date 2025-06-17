import { param , check } from "express-validator";
import validateRequest from "../utils/validateRequest.js";


export const validateSyncProductPricing = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('basePrice')
        .exists({ checkFalsy: true })
        .withMessage('Base price is required')
        .isNumeric({min:1})
        .withMessage('Base price must be a number') ,
        

    check('quantityPriceTiers')
        .optional()
        .isArray()
        .withMessage('Quantity price tiers must be an array'),

    check('quantityPriceTiers.*.min')
        .if(check('quantityPriceTiers').isArray({ min: 1 }))
        .exists({ checkFalsy: true })
        .withMessage('Tier minimum quantity is required')
        .isInt({ min: 1 })
        .withMessage('Tier minimum must be at least 1'),

    check('quantityPriceTiers.*.max')
        .if(check('quantityPriceTiers').isArray({ min: 1 }))
        .optional()
        .isInt({ min: 1 })
        .withMessage('Tier maximum must be at least 1'),

    check('quantityPriceTiers.*.price')
        .if(check('quantityPriceTiers').isArray({ min: 1 }))
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

    check('leadTime')
        .optional()
        .isArray()
        .withMessage('Lead time must be an array'),

    check('leadTime.*.min')
        .if(check('leadTime').isArray({ min: 1 }))
        .optional()
        .isInt({ min: 1 })
        .withMessage('Lead time minimum must be at least 1'),

    check('leadTime.*.max')
        .if(check('leadTime').isArray({ min: 1 }))
        .optional()
        .isInt({ min: 1 })
        .withMessage('Lead time maximum must be at least 1'),

    check('leadTime.*.days')
        .if(check('leadTime').isArray({ min: 1 }))
        .optional()
        .isInt({ min: 1 })
        .withMessage('Lead time days must be at least 1') ,



        (req , res , next)=>validateRequest(req , res, next)
];