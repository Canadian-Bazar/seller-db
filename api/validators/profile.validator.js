import { check, body } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import httpStatus from 'http-status';

export const updateProfileValidator = [
  check('companyName')
    .optional()
    .notEmpty()
    .withMessage('Company name cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('Company name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s.,&()-]+$/)
    .withMessage('Company name can only contain letters, numbers, spaces, and common business characters (.,&()-)'),

  check('logo')
    .optional()
    .isString()
    .withMessage('Logo must be a string'),

  check('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Parent Category must be a valid Mongo ID'),

  check('categories')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Categories must be an array with at least one category'),

  check('categories.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID format'),

  check('businessNumber')
    .optional()
    .notEmpty()
    .withMessage('Business Number cannot be empty')
    .isLength({ min: 5, max: 20 })
    .withMessage('Business Number must be between 5 and 20 characters')
    .isAlphanumeric()
    .withMessage('Business Number can only contain letters and numbers'),

  check('street')
    .optional()
    .notEmpty()
    .withMessage('Street cannot be empty')
    .isLength({ min: 5, max: 100 })
    .withMessage('Street must be between 5 and 100 characters'),

  check('city')
    .optional()
    .notEmpty()
    .withMessage('City cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' ' })
    .withMessage('City can only contain letters and spaces'),

  check('state')
    .optional()
    .notEmpty()
    .withMessage('State cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' ' })
    .withMessage('State can only contain letters and spaces'),

  check('zip')
    .optional()
    .notEmpty()
    .withMessage('Postal code cannot be empty')
    .isPostalCode('CA')
    .withMessage('Invalid ZIP code format')
    .matches(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/)
    .withMessage('Postal code must follow the Canadian format (e.g., A1A 1A1)'),

  check('yearEstablished')
    .optional()
    .isInt({ min: 1500, max: new Date().getFullYear() })
    .withMessage(`Year Established must be between 1500 and ${new Date().getFullYear()}`),

check('companyWebsite')
  .optional({ nullable: true })
  .custom((value) => {
    if (value === '') return true; 
    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(value)) {
      throw new Error('Invalid Company Website URL');
    }
    return true;
  }) ,


  check('numberOfEmployees')
    .optional({nullable:true})
    .isInt({ min: 1 })
    .withMessage('Number of Employees must be a positive integer'),

  check('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be a array'),

  check('certifications.*.name')
    .optional()
    .notEmpty()
    .withMessage('Certification name is required')
    .isString(),

  check('certifications.*.url')
    .optional()
    .notEmpty()
    .withMessage('Certification URL is required')
    .isString()
    .withMessage('Invalid certification URL'),

  check('socialMediaLinks')
    .optional()
    .isArray()
    .withMessage('Social links must be an array'),

  check('socialMediaLinks.*.platform')
    .optional()
    .notEmpty()
    .withMessage('Social media platform is required')
    .isString(),

  check('socialMediaLinks.*.url')
    .optional()
    .notEmpty()
    .withMessage('Social media URL is required')
    .isURL()
    .withMessage('Invalid social media URL'),

  check('languagesSupported')
    .optional()
    .notEmpty()
    .withMessage('Languages supported is required')
    .isArray({ min: 1 })
    .withMessage('Languages supported must be an array with at least one language'),

  check('languagesSupported.*.name')
    .optional()
    .notEmpty()
    .withMessage('Language name is required')
    .isString()
    .withMessage('Language name must be a string'),

  check('languagesSupported.*.code')
    .optional()
    .notEmpty()
    .withMessage('Language code is required')
    .isString()
    .withMessage('Language code must be a string'),

  body().custom((value, { req }) => {
    const allowedFields = [
      'companyName',
      'logo',
      'parentCategory',
      'categories',
      'businessNumber',
      'street',
      'city',
      'state',
      'zip',
      'yearEstablished',
      'companyWebsite',
      'numberOfEmployees',
      'certifications',
      'socialMediaLinks',
      'languagesSupported'
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

  (req, res, next) => validateRequest(req, res, next)
];


export const getProfileValidator =[
    
    (req, res, next) => validateRequest(req, res, next)
]

export const addCertificationsValidator = [
  check('certifications')
    .exists({ checkFalsy: true })
    .withMessage('Certifications array is required')
    .isArray({ min: 1 })
    .withMessage('Certifications must be a non-empty array'),

  check('certifications.*.name')
    .exists({ checkFalsy: true })
    .withMessage('Certification name is required')
    .isString()
    .withMessage('Certification name must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Certification name must be between 1 and 100 characters'),

  check('certifications.*.url')
    .exists({ checkFalsy: true })
    .withMessage('Certification URL is required')
    .isString()
    .withMessage('Certification URL must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Certification URL cannot be empty') ,
    
  (req, res, next) => validateRequest(req, res, next)
]




