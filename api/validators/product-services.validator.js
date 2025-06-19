import { check , param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";


export const validateCreateProductServices = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('services')
        .isArray({min:1})
        .withMessage('Services must be a non empty array'),

    check('services.*')
        .if(check('services').isArray({ min: 1 }))
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