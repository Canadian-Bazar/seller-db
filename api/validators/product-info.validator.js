import { check , param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateUpdateProduct = [
    param('productId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Product ID should be a mongoose ID'),

    check('name')
        .optional() 
        .isString()
        .withMessage('Product name must be a string')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Product name must be between 3 and 200 characters'),

    check('categoryId')
        .optional() 
        .isMongoId()
        .withMessage('Category ID must be a valid mongoose ID'),

    check('about')
        .optional()
        .isArray()
        .withMessage('About must be an array'),

    check('about.*')
        .if(check('about').isArray({ min: 1 }))
        .isString()
        .withMessage('Each about point must be a string')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Each about point must be between 1 and 500 characters'),

    check('about').custom((aboutArray) => {
        if (!aboutArray) return true;
        
        if (aboutArray.length > 10) {
            throw new Error('Maximum 10 about points allowed');
        }
        return true;
    }),

    check().custom((value, { req }) => {
        const { name, categoryId, about } = req.body;
        
        if (!name && !categoryId && !about) {
            throw new Error('At least one field (name, categoryId, or about) must be provided for update');
        }
        return true;
    }),

      check('moq')
  .optional({ nullable: true, checkFalsy: true }) // allows undefined, null, '' (empty string)
  .isInt({ min: 1 })
  .withMessage('Minimum order quantity must be a number greater than or equal to 1') ,


  





    (req, res, next) => validateRequest(req, res, next)
];



export const validateCreateProduct = [
    check('name')
        .exists({ checkFalsy: true })
        .withMessage('Product name is required')
        .isString()
        .withMessage('Product name must be a string')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Product name must be between 3 and 200 characters'),

    check('categoryId')
        .exists({ checkFalsy: true })
        .withMessage('Category is required')
        .isMongoId()
        .withMessage('Category ID must be a valid mongoose ID'),


    

    check('about')
       .exists()
       .withMessage('About is required')
       .notEmpty()
       .withMessage('About cannot be empty')

        .isArray()
        .withMessage('About must be an array')
        .custom((aboutArray) => {
            if (!Array.isArray(aboutArray) || aboutArray.length < 2) {
                throw new Error('Please mention at least two points in about section');
            }
            return true;
        })
        .bail(),

    check('about.*')
        .if(check('about').isArray({ min: 1 }))
        .isString()
        .withMessage('Each about point must be a string')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Each about point must be between 1 and 500 characters')
        .bail(),

 

    check('about').custom((aboutArray) => {
        if (!aboutArray) return true;
        
        if (aboutArray.length > 10) {
            throw new Error('Maximum 10 about points allowed');
        }
        return true;
    }) ,

      check('moq')
        .exists().withMessage('Minimum order quantity is required')
        .bail() // stop if previous validator failed
        .isInt({ min: 1 }).withMessage('Minimum order quantity must be a number greater than or equal to 1') ,
    

    (req, res, next) => validateRequest(req, res, next)
];



export const validateGetProductInfo =[
     param('productId')
        .exists()
        .withMessage('Product ID is required')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),     

        (req , res , next)=>validateRequest(req , res, next)
]
