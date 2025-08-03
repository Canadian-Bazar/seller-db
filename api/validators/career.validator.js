import { paginationValidator } from "./pagination.validator.js";
import validateRequest from "../utils/validateRequest.js";
import { check } from "express-validator";

export const validatedGetCareers = [
    ...paginationValidator,
    
    check('isVerified')
        .optional()
        .notEmpty()
        .withMessage('isVerified cannot be empty')
        .isBoolean()
        .withMessage('isVerified must be a boolean'),
    
    check('postalCode')
        .optional()
        .notEmpty()
        .withMessage('postalCode cannot be empty')
        .isString()
        .withMessage('postalCode must be a string')
        .isLength({ min: 3, max: 10 })
        .withMessage('postalCode must be between 3 and 10 characters'),
    
    check('state')
        .optional()
        .notEmpty()
        .withMessage('state cannot be empty')
        .isString()
        .withMessage('state must be a string')
        .isLength({ min: 2, max: 50 })
        .withMessage('state must be between 2 and 50 characters'),
    
    check('city')
        .optional()
        .notEmpty()
        .withMessage('city cannot be empty')
        .isString()
        .withMessage('city must be a string')
        .isLength({ min: 2, max: 50 })
        .withMessage('city must be between 2 and 50 characters'),
    
    check('category')
        .optional()
        .notEmpty()
        .withMessage('category cannot be empty')
        .isMongoId()
        .withMessage('category must be a valid Mongo ID'),
    
    check('categories')
        .optional()
        .isArray({ min: 1 })
        .withMessage('categories must be a non-empty array of valid Mongo IDs'),
    
    check('categories.*')
        .optional()
        .isMongoId()
        .withMessage('Each category ID must be a valid Mongo ID'),
    
    check('search')
        .optional()
        .notEmpty()
        .withMessage('search cannot be empty')
        .isString()
        .withMessage('search must be a string')
        .isLength({ min: 2, max: 100 })
        .withMessage('search must be between 2 and 100 characters'),
    
    check('sortBy')
        .optional()
        .isIn([
            'newest',
            'oldest',
            
            
        ])
        .withMessage('Invalid sortBy value. Must be one of: newest, oldest'),

    
    (req, res, next) => validateRequest(req, res, next)
];
