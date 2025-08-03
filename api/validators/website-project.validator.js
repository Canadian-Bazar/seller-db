import { check , query ,param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";
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

 (req, res, next) => validateRequest(req, res, next)
];