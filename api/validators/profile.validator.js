import { check, body } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import httpStatus from 'http-status';

export const updateProfileValidator = [
  check('companyName')
    .optional()
    .not()
    .isEmpty()
    .withMessage('Full Name cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full Name must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' ' })
    .withMessage('Full Name can only contain letters and spaces'),

  check('businessType')
    .optional()
    .not()
    .isEmpty()
    .withMessage('Business Type cannot be empty')
    .isMongoId()
    .withMessage('Invalid Business Type ID format'),

  check('categories')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Categories must be an array with at least one category'),

  check('categories.*')
    .isMongoId()
    .withMessage('Invalid category ID format'),

  check('businessNumber')
    .optional()
    .not()
    .isEmpty()
    .withMessage('Business Number cannot be empty')
    .isLength({ min: 5, max: 20 })
    .withMessage('Business Number must be between 5 and 20 characters')
    .isAlphanumeric()
    .withMessage('Business Number can only contain letters and numbers'),

  check('street')
    .optional()
    .not()
    .isEmpty()
    .withMessage('Street cannot be empty')
    .isLength({ min: 5, max: 100 })
    .withMessage('Street must be between 5 and 100 characters'),

  check('city')
    .optional()
    .not()
    .isEmpty()
    .withMessage('City cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' ' })
    .withMessage('City can only contain letters and spaces'),

  check('state')
    .optional()
    .not()
    .isEmpty()
    .withMessage('State cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' ' })
    .withMessage('State can only contain letters and spaces'),

  check('zip')
    .optional()
    .not()
    .isEmpty()
    .withMessage('ZIP code cannot be empty') ,
    // .isPostalCode({locale:'CA'})
    // .withMessage('Invalid ZIP code format'),



    body()
    .custom((value, { req }) => {
      const allowedFields = [
        'fullName',
        'businessType',
        'categories',
        'businessNumber',
        'street',
        'city',
        'state',
        'zip'
      ];
      
      const providedFields = Object.keys(req.body).filter(field => 
        allowedFields.includes(field)
      );
      
      if (providedFields.length === 0) {
        throw buildErrorObject(
          httpStatus.BAD_REQUEST, 
          'At least one valid field must be provided for update'
        );
      }
      
      return true;
    }),



    (req , res, next)=>validateRequest(req, res, next)

]



export const getProfileValidator =[
    
    (req, res, next) => validateRequest(req, res, next)
]



