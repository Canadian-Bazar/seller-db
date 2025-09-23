import { check , query , param } from "express-validator";
import  {paginationValidator} from './pagination.validator.js';
import validateRequest from "../utils/validateRequest.js";



export const validateGetAllCategories = [
    ...paginationValidator ,
    (req , res  , next)=>validateRequest(req , res, next)
]


export const validateGetSubCategories = [
    ...paginationValidator,
    query('parentCategoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Parent Category ID'),

    (req , res  , next)=>validateRequest(req , res, next)
]

export const validateCreateSubCategory = [
    check('name')
        .exists({ checkFalsy: true })
        .withMessage('Subcategory name is required')
        .isString()
        .withMessage('Subcategory name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Subcategory name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s.,&()-]+$/)
        .withMessage('Subcategory name can only contain letters, numbers, spaces, and common characters (.,&()-)'),

    check('parentCategoryId')
        .exists({ checkFalsy: true })
        .withMessage('Parent Category ID is required')
        .isMongoId()
        .withMessage('Parent Category ID must be a valid Mongo ID'),

    check('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Description must be between 10 and 500 characters'),

    check('image')
        .optional()
        .isString()
        .withMessage('Image must be a string')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Image cannot be empty'),

    (req, res, next) => validateRequest(req, res, next)
]