import { param , check } from "express-validator";
import validateRequest from "../utils/validateRequest.js";


export const validateSyncProductAttributes = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('attributes')
        .isArray()
        .withMessage('Attributes must be an array')
        .isLength({ min: 1 })
        .withMessage('Attributes array cannot be empty')
        .bail(),

    check('attributes.*._id')
        .optional()
        .isMongoId()
        .withMessage('Invalid Attribute ID'),

    check('attributes.*.name')
        .exists({ checkFalsy: true })
        .withMessage('Attribute name is required')
        .isString()
        .withMessage('Attribute name must be a string')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Attribute name must be between 1 and 100 characters')
        .bail(),

    check('attributes.*.attributes')
        .isArray()
        .withMessage('Attributes field must be an array')
        .isLength({ min: 1 })
        .withMessage('Attributes array cannot be empty')
        .bail(),

    check('attributes.*.attributes.*.field')
        .exists({ checkFalsy: true })
        .withMessage('Field name is required')
        .isString()
        .withMessage('Field name must be a string')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Field name must be between 1 and 50 characters')
        .bail(),

    check('attributes.*.attributes.*.value')
        .exists({ checkFalsy: true })
        .withMessage('Field value is required')
        .isString()
        .withMessage('Field value must be a string')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Field value must be between 1 and 255 characters')
        .bail(),

    check('attributes')
        .custom((attributesArray) => {
            const attributeNames = attributesArray.map(attr => attr.name?.toLowerCase().trim());
            const uniqueNames = new Set(attributeNames);
            
            if (attributeNames.length !== uniqueNames.size) {
                throw new Error('Duplicate attribute names are not allowed');
            }
            return true;
        }),

    check('attributes.*.attributes')
        .custom((attributesArray, { path }) => {
            const fieldNames = attributesArray.map(attr => attr.field?.toLowerCase().trim());
            const uniqueFields = new Set(fieldNames);
            
            if (fieldNames.length !== uniqueFields.size) {
                throw new Error(`Duplicate field names found in attribute at ${path}`);
            }
            return true;
        })
];


export const validateGetProductAttributes =[
    (req , res, next)=>validateRequest(req , res , next)
]