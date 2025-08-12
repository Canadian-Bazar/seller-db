import { check , param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";


export const validateCreateProductServices = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('services')
    .optional()
    .custom((value) => {
        if (value === undefined || value === null) return true; // skip
        if (Array.isArray(value) && value.length === 0) return true; // skip empty array
        if (!Array.isArray(value)) throw new Error('Services must be an array');
        return true;
    }),

check('services.*')
    .if(check('services').exists().isArray({ min: 1 }))
    .isString()
    .withMessage('Each service must be a string')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each service must be between 1 and 200 characters'),

    


        (req , res, next)=>validateRequest(req , res, next)

   
]


export const validateGetProductServices =[
   param('productId')
        .exists()
        .withMessage('Product ID is required')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

        (req , res , next)=>validateRequest(req , res, next)
]