import { check , param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";


export const validateSyncImages = [
    param('productId')
        .exists()
        .withMessage('Product ID is required')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    check('images')
        .optional()
        .isArray()
        .withMessage('Images should be an array'),

    check('images.*')
        .optional()
        .isString()
        .withMessage('Each image must be a string'),

    (req, res, next) => validateRequest(req, res, next)
];



export const validateGetImages =[
        param('productId')
        .exists()
        .withMessage('Product ID is required')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID') ,

   (req, res, next) => validateRequest(req, res, next)


]