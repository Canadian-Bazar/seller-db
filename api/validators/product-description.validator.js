import { check , query , param } from "express-validator"
import validateRequest from "../utils/validateRequest.js"


export const validateSyncProductDescription = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('images')
        .optional()
        .isArray()
        .withMessage('Images must be an array'),

    check('images.*')
        .if(check('images').isArray({ min: 1 }))
        .isString()
        .withMessage('Each image must be a string URL'),

    check('points.*')
        .if(check('points').isArray({ min: 1 }))
        .isString()
        .withMessage('Each point must be a string')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Each point must be between 1 and 500 characters'),

    check('attributes')
        .optional()
        .isArray()
        .withMessage('Attributes must be an array'),

    check('attributes.*.field')
        .if(check('attributes').isArray({ min: 1 }))
        .exists({ checkFalsy: true })
        .withMessage('Attribute field is required')
        .isString()
        .withMessage('Attribute field must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Attribute field must be between 1 and 100 characters'),

    check('attributes.*.value')
        .if(check('attributes').isArray({ min: 1 }))
        .exists({ checkFalsy: true })
        .withMessage('Attribute value is required')
        .isString()
        .withMessage('Attribute value must be a string')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Attribute value must be between 1 and 500 characters'),

        (req , res , next)=>validateRequest(req , res , next)


]



export const validateSyncProductDescriptionImages = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('images')
        .optional()
        .isArray()
        .withMessage('Images should be an array')
        .customSanitizer((value) => {
            return Array.isArray(value) ? value.filter(img => img && img.trim() !== '') : value;
        }),

    check('images.*')
        .optional()
        .isString()
        .notEmpty()
        .withMessage('Each image must be a non-empty string') ,

    (req, res, next) => validateRequest(req, res, next)
]


export const validateGetProductDescription = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'), 
    (req, res, next) => validateRequest(req, res, next) 
]