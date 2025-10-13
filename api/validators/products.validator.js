


import{query , check ,param} from 'express-validator'
import { paginationValidator } from './pagination.validator.js'
import validateRequest from '../utils/validateRequest.js'



export const validatedGetProducst =[
    ...paginationValidator  ,

  check('isVerified')
    .optional()
    .notEmpty()
    .withMessage('isVerified cannot be empty')
    .isBoolean()
    .withMessage('isVerified must be a boolean'),

  check('inComplete')
    .optional()
    .notEmpty()
    .withMessage('inComplete paramter should be a boolean')
    .isBoolean()
    .withMessage('inComplete must be a boolean'),


    check('isComplete')
    .optional()
    .notEmpty()
    .withMessage('inComplete paramter should be a boolean')
    .isBoolean()
    .withMessage('inComplete must be a boolean'),

    check('categories')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Categories must be a non-empty array of valid Mongo IDs'),

  check('categories.*')
    .isMongoId()
    .withMessage('Each category ID must be a valid Mongo ID'),

  check('sortBy')
    .optional()
    .isIn([
      'mostViewed',
      'mostQuoted',
      'mostAcceptedQuotations',
      'mostRejectedQuotations',
      'mostPopular',
      'bestseller'
    ])
    .withMessage('Invalid sortBy value'),

    check('createdAt')
    .optional()
    .notEmpty()
    .withMessage('createdAt parameter cannot be empty')
    .isInt()
    .withMessage('createdAt should be a valid integer')
    .isIn([-1 , 1])
    .withMessage('Invalid createdAt parameter') ,


  

  (req, res, next) => validateRequest(req, res, next)

]


export const validateGetProductNames =[
  ...paginationValidator ,
  (req , res , next)=>validateRequest(req , res, next)
]




export const validateDeleteProduct =[
  param('productId')
  .exists({checkFalsy:true})
  .isMongoId()
  .withMessage('Product ID is required')
  .notEmpty()
  .withMessage('Product ID is required') ,
  (req , res , next)=>validateRequest(req , res , next)
]




export const validateArchiveProduct =[
  param('productId')
  .exists({checkFalsy:true})
  .isMongoId()  
  .withMessage('Product ID is required')
  .notEmpty()
  .withMessage('Product ID is required') ,
  (req , res , next)=>validateRequest(req , res , next)
]


export const validateToggleProductStatus = [
  param('productId')
    .exists({ checkFalsy: true })
    .isMongoId()
    .withMessage('Product ID is required')
    .notEmpty()
    .withMessage('Product ID is required'),
  check('isActive')
    .exists({ checkFalsy: true })
    .withMessage('isActive is required')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  (req, res, next) => validateRequest(req, res, next)
]