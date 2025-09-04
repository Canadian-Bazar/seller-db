import validateRequest from "../utils/validateRequest.js";
import { check , param } from "express-validator";
export const validateSyncProductVariations = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('variations')
        .optional()
        .isArray()
        .withMessage('Variations must be an array'),

    // check('variations.*.field')
    //     .if(check('variations').isArray({ min: 1 }))
    //     .exists({ checkFalsy: true })
    //     .withMessage('Variation field is required')
    //     .isString()
    //     .withMessage('Variation field must be a string')
    //     .trim()
    //     .isLength({ min: 1, max: 50 })
    //     .withMessage('Variation field must be between 1 and 50 characters'),

    // check('variations.*.values')
    //     .if(check('variations').isArray({ min: 1 }))
    //     .isArray({ min: 1 })
    //     .withMessage('Variation values must be a non-empty array'),

    // check('variations.*.values.*')
    //     .if(check('variations').isArray({ min: 1 }))
    //     .isString()
    //     .withMessage('Each variation value must be a string')
    //     .trim()
    //     .isLength({ min: 1, max: 100 })
    //     .withMessage('Each variation value must be between 1 and 100 characters'),

    check('customizableOptions')
        .optional()
        .isArray()
        .withMessage('Customizable options must be an array'),

    check('customizableOptions.*.option')
        .if(check('customizableOptions').isArray({ min: 1 }))
        .exists({ checkFalsy: true })
        .withMessage('Customizable option name is required')
        .isString()
        .withMessage('Customizable option must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Customizable option must be between 1 and 100 characters'),

    check('customizableOptions.*.quantity')
        .if(check('customizableOptions').isArray({ min: 1 }))
        .optional()
        .isString()
        .withMessage('Customizable option quantity must be a string'),

    (req , res  , next)=>validateRequest(req ,res , next)
]


export const validateGetProductVariations =[
    param('productId')
    .exists()
    .withMessage('Product ID is required')
    .notEmpty()
    .withMessage('Product ID cannot be empty')
    .isMongoId()
    .withMessage('Invalid Mongo ID'),
    

    (req , res, next) =>validateRequest(req , res, next)
    
]