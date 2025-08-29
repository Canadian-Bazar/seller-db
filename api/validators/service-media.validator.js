import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

export const validateSyncServiceMedia = [
    param('serviceId')
        .exists({ checkFalsy: true })
        .isMongoId()
        .withMessage('Service ID should be a mongoose ID'),

    check('images')
        .exists({ checkFalsy: true })
        .withMessage('Images are required')
        .isArray({ min: 1 })
        .withMessage('Images must be a non-empty array'),

    check('images.*')
        .if(check('images').isArray({ min: 1 }))
        .isString()
        .withMessage('Each image must be a string URL')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Each image URL cannot be empty'),

    check('videos')
          
        .optional()
        .isArray()
        .withMessage('Videos must be an array'),

    check('videos.*')
        .if(check('videos').isArray({ min: 1 }))
        .isString()
        .withMessage('Each video must be a string URL')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Each video URL cannot be empty'),

  check("warranty")
    .optional()
    .custom((value, { req }) => {
      if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Warranty must be an object");
      }
      if (Object.keys(value).length === 0) {
        req.body.warranty = null;
      }
      return true;
    }),

  check("warranty.duration")
    .if(check("warranty").custom(w => w && Object.keys(w).length > 0))
    .exists({ checkFalsy: true })
    .withMessage("Warranty duration is required")
    .isNumeric()
    .withMessage("Warranty duration must be a number")
    .custom(value => {
      if (value <= 0) {
        throw new Error("Warranty duration must be greater than 0");
      }
      return true;
    }),

  check("warranty.unit")
    .if(check("warranty").custom(w => w && Object.keys(w).length > 0))
    .exists({ checkFalsy: true })
    .withMessage("Warranty unit is required")
    .isString()
    .withMessage("Warranty unit must be a string")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Warranty unit must be between 1 and 50 characters"),

    check('industryCertifications')
         .optional()
        .isArray()
        .withMessage('Industry certifications must be a non-empty array'),

    check('industryCertifications.*')
        .if(check('industryCertifications').isArray({ min: 1 }))
        .isMongoId()
        .withMessage('Each certification must be a valid Mongo ID') ,
     


    check('brochure')
        .optional()
        .isString()
        .withMessage('Brochure must be a string URL')
        ,

    (req, res, next) => validateRequest(req, res, next)
];

export const validateGetServiceMedia = [
    param('serviceId')
        .exists()
        .withMessage('Service ID is required')
        .notEmpty()
        .withMessage('Service ID is required')
        .isMongoId()
        .withMessage('Invalid Mongo ID'),

    (req, res, next) => validateRequest(req, res, next)
];