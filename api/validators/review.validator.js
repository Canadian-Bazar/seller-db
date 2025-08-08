import { check , query , param , body } from "express-validator";
import validateRequest from "../utils/validateRequest.js";
import { paginationValidator } from "./pagination.validator.js";
import mongoose from "mongoose";

export const validateGetReviewsByProductId = [
    ...paginationValidator,
    
    query('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid Product ID'),
    
    query('rating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be an integer between 1 and 5'),
    
    query('oldestFirst')
        .optional()
        .isBoolean()
        .withMessage('oldestFirst must be a boolean'),

    query('sortByRating')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('sortByRating must be either asc or desc'),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetAllReviewsForSeller = [
    ...paginationValidator,
    
    query('category')
        .optional()
        .isMongoId()
        .withMessage('Invalid Category ID'),
    
    query('productName')
        .optional()
        .isString()
        .withMessage('Product name must be a string'),
    
    query('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be a positive number'),
    
    query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be a positive number'),
    
    query('productIds')
        .optional()
        .custom((value) => {
            if (Array.isArray(value)) {
                return value.every(id => mongoose.Types.ObjectId.isValid(id));
            }
            if (typeof value === 'string') {
                return mongoose.Types.ObjectId.isValid(value);
            }
            return false;
        })
        .withMessage('ProductIds must be valid MongoDB ObjectId(s)'),
    
    query('rating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be an integer between 1 and 5'),
    
    query('oldestFirst')
        .optional()
        .isBoolean()
        .withMessage('oldestFirst must be a boolean'),

    query('sortByRating')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('sortByRating must be either asc or desc'),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetReviewsAnalytics = [
    (req, res, next) => validateRequest(req, res, next)
];