import { check , query ,param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";
import { paginationValidator } from "./pagination.validator.js";
export const validateGetAllWebsiteProjects = [
 check('page')
   .optional()
   .isInt({ min: 1 })
   .withMessage('Page must be a positive integer'),

 check('limit')
   .optional()
   .isInt({ min: 1, max: 100 })
   .withMessage('Limit must be between 1 and 100'),

 check('projectStatus')
   .optional()
   .isIn(['initiated', 'documentation_created', 'plan_selected', 'payment_completed', 'in_progress', 'completed', 'cancelled'])
   .withMessage('Invalid project status'),

 (req, res, next) => validateRequest(req, res, next)
];

export const validateGetWebsiteProjectById = [
 param('id')
   .exists({ checkFalsy: true })
   .withMessage('Project ID is required')
   .isMongoId()
   .withMessage('Project ID must be a valid MongoDB ObjectId'),

 (req, res, next) => validateRequest(req, res, next)
];

export const validateUpdateWebsiteProjectReport = [
 param('id')
   .exists({ checkFalsy: true })
   .withMessage('Project ID is required')
   .isMongoId()
   .withMessage('Project ID must be a valid MongoDB ObjectId'),

 check('report')
   .exists({ checkFalsy: true })
   .withMessage('Report is required')
   .isString()
   .withMessage('Report must be a string')
   .trim()
   .isLength({ min: 1, max: 5000 })
   .withMessage('Report must be between 1 and 5000 characters'),



  check('percentageCompletion')
   .exists({ checkFalsy: true })
   .withMessage('Percentage completion is required')
   .isInt({ min: 0, max: 100 })
   .withMessage('Percentage completion must be an integer between 0 and 100') ,


 (req, res, next) => validateRequest(req, res, next)
];




export const validateGetProjectStatus = [
   (req , res , next) => validateRequest(req, res, next)
]

export const validateGetAllWebsiteProjectsForAdmin = [
   ...paginationValidator,
   
   check('projectStatus')
      .optional()
      .isIn(['initiated', 'documentation_created', 'plan_selected', 'payment_completed', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Invalid project status'),

   check('paymentStatus')
      .optional()
      .isIn(['pending', 'paid', 'failed', 'partial_payment'])
      .withMessage('Invalid payment status'),

   (req, res, next) => validateRequest(req, res, next)
]

export const validateUpdateWebsiteProjectStatus = [
   param('id')
      .exists({ checkFalsy: true })
      .withMessage('Project ID is required')
      .isMongoId()
      .withMessage('Project ID must be a valid MongoDB ObjectId'),

   check('projectStatus')
      .optional()
      .isIn(['initiated', 'documentation_created', 'plan_selected', 'payment_completed', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Invalid project status'),

   check('notes')
      .optional({ nullable: true })
      .isString()
      .withMessage('Notes must be a string')
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes cannot exceed 2000 characters'),

   check('percentageCompletion')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Percentage completion must be an integer between 0 and 100'),

   check('expectedCompletionDate')
      .optional()
      .isISO8601()
      .withMessage('Expected completion date must be a valid ISO 8601 date'),

   check('actualCompletionDate')
      .optional()
      .isISO8601()
      .withMessage('Actual completion date must be a valid ISO 8601 date'),

   (req, res, next) => validateRequest(req, res, next)
]

export const validateUpdateProjectPayment = [
   param('id')
      .exists({ checkFalsy: true })
      .withMessage('Project ID is required')
      .isMongoId()
      .withMessage('Project ID must be a valid MongoDB ObjectId'),

   check('paymentStatus')
      .optional()
      .isIn(['pending', 'paid', 'failed', 'partial_payment'])
      .withMessage('Invalid payment status'),

   check('amountPaid')
      .optional()
      .isNumeric()
      .withMessage('Amount paid must be a number')
      .custom(value => {
         if (value < 0) {
            throw new Error('Amount paid cannot be negative');
         }
         return true;
      }),

   check('amountPending')
      .optional()
      .isNumeric()
      .withMessage('Amount pending must be a number')
      .custom(value => {
         if (value < 0) {
            throw new Error('Amount pending cannot be negative');
         }
         return true;
      }),

   check('transactionId')
      .optional()
      .isMongoId()
      .withMessage('Transaction ID must be a valid MongoDB ObjectId'),

   (req, res, next) => validateRequest(req, res, next)
]

export const validateUpdateWebsiteProjectSellerInputs = [
 param('id')
   .exists({ checkFalsy: true })
   .withMessage('Project ID is required')
   .isMongoId()
   .withMessage('Project ID must be a valid MongoDB ObjectId'),

 check('anyChanges')
   .optional()
   .isString()
   .withMessage('Any changes must be a string')
   .trim()
   .isLength({ max: 2000 })
   .withMessage('Any changes cannot exceed 2000 characters'),

 check('additionalSuggestions')
   .optional()
   .isString()
   .withMessage('Additional suggestions must be a string')
   .trim()
   .isLength({ max: 2000 })
   .withMessage('Additional suggestions cannot exceed 2000 characters'),

 (req, res, next) => validateRequest(req, res, next)
]

export const validateUpdateWebsiteProjectProgress = [
 param('id')
   .exists({ checkFalsy: true })
   .withMessage('Project ID is required')
   .isMongoId()
   .withMessage('Project ID must be a valid MongoDB ObjectId'),

 check('percentageCompletion')
   .optional()
   .isInt({ min: 0, max: 100 })
   .withMessage('Percentage completion must be an integer between 0 and 100'),

 check('report')
   .optional()
   .isString()
   .withMessage('Report must be a string')
   .trim()
   .isLength({ max: 5000 })
   .withMessage('Report cannot exceed 5000 characters'),

 check('additionalDetails')
   .optional()
   .isString()
   .withMessage('Additional details must be a string')
   .trim()
   .isLength({ max: 5000 })
   .withMessage('Additional details cannot exceed 5000 characters'),

 check('report2')
   .optional()
   .isString()
   .withMessage('Report 2 must be a string')
   .trim()
   .isLength({ max: 5000 })
   .withMessage('Report 2 cannot exceed 5000 characters'),

 check('websiteOverviewLink')
   .optional()
   .isURL()
   .withMessage('Website overview link must be a valid URL'),

 check('projectStatus')
   .optional()
   .isIn(['initiated', 'documentation_created', 'plan_selected', 'payment_completed', 'in_progress', 'completed', 'cancelled'])
   .withMessage('Invalid project status'),

 check('notes')
   .optional()
   .isString()
   .withMessage('Notes must be a string')
   .trim()
   .isLength({ max: 2000 })
   .withMessage('Notes cannot exceed 2000 characters'),

 (req, res, next) => validateRequest(req, res, next)
]

export const validateGetCompletionPaymentDetails = [
 param('token')
   .exists({ checkFalsy: true })
   .withMessage('Completion payment token is required')
   .isLength({ min: 32, max: 64 })
   .withMessage('Invalid token format')
   .matches(/^[a-f0-9]+$/)
   .withMessage('Token must contain only hexadecimal characters'),

 (req, res, next) => validateRequest(req, res, next)
]

export const validateUpdateWebsiteProjectSeller = [
 param('id')
   .exists({ checkFalsy: true })
   .withMessage('Project ID is required')
   .isMongoId()
   .withMessage('Project ID must be a valid MongoDB ObjectId'),

 check('additionalDetails')
   .optional()
   .isString()
   .withMessage('Additional details must be a string')
   .trim()
   .isLength({ max: 5000 })
   .withMessage('Additional details cannot exceed 5000 characters'),

 check('notes')
   .optional()
   .isString()
   .withMessage('Notes must be a string')
   .trim()
   .isLength({ max: 2000 })
   .withMessage('Notes cannot exceed 2000 characters'),

 (req, res, next) => validateRequest(req, res, next)
]