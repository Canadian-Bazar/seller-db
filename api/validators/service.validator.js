import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";
import { paginationValidator } from "./pagination.validator.js";
import { validate } from 'node-cron';

export const validateCreateService = [
    check('name')
        .exists({ checkFalsy: true })
        .withMessage('Service name is required')
        .isString()
        .withMessage('Service name must be a string')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Service name must be between 3 and 200 characters'),

    check('description')
        .exists({ checkFalsy: true })
        .withMessage('Service description is required')
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters'),


    check('category')
         .exists({ checkFalsy: true })
        .withMessage('Category is required')
        .isMongoId()
        .withMessage('Category must be a valid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateUpdateService = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('name')
        .optional() 
        .isString()
        .withMessage('Service name must be a string')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Service name must be between 3 and 200 characters'),

    check('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters'),

    check().custom((value, { req }) => {
        const { name, description } = req.body;
        
        if (!name && !description) {
            throw new Error('At least one field (name or description) must be provided for update');
        }
        return true;
    }),

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetServiceInfo = [
    param('serviceId')
        .exists()
        .withMessage('Service ID is required')
        .notEmpty()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),     

    (req, res, next) => validateRequest(req, res, next)
];



export const validateGetServices = [
    ...paginationValidator,

    check('search')
        .optional()
        .isString()
        .withMessage('Search must be a string') ,
        

    check('inComplete')
        .optional()
        .notEmpty()
        .withMessage('inComplete parameter should be a boolean')
        .isBoolean()
        .withMessage('inComplete must be a boolean'),



      check('isComplete')
            .optional()
            .notEmpty()
            .withMessage('inComplete paramter should be a boolean')
            .isBoolean()
            .withMessage('inComplete must be a boolean'),

    check('createdAt')
        .optional()
        .isInt()
        .withMessage('createdAt should be a valid integer')
        .isIn([-1, 1])
        .withMessage('Invalid createdAt parameter'),

    (req, res, next) => validateRequest(req, res, next)
];




export const validateDeleteService = [
    param('id')
        .exists()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Service ID must be a valid MongoDB ObjectId'),    

    (req, res, next) => validateRequest(req, res, next)
];




export const validateArchiveService = [
    param('serviceId')  
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    (req, res, next) => validateRequest(req, res, next)
];