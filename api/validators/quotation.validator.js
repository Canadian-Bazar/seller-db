import {check , query , param} from 'express-validator'
import validateRequest from '../utils/validateRequest.js'



export const validateMutateQuotation =[
    check('quotationId')
        .exists().withMessage('Quotation ID is required')
        .notEmpty().withMessage('Quotation ID cannot be empty')
        .isString().withMessage('Quotation ID must be a string')
        .isMongoId().withMessage('Quotation ID must be a valid MongoDB ObjectId')  , 
        
    check('status')
        .exists().withMessage('Status is required')
        .notEmpty().withMessage('Status cannot be empty')
        .isString().withMessage('Status must be a string')
        .isIn(['accepted', 'rejected' , 'negotiate']).withMessage('Status must be either approved or rejected') ,

    (req , res , next)=>validateRequest(req , res , next)


]



export const validatedGetQuotations =[
    check('status')
    .optional()
    .isString()
    .withMessage('Status must be a valid string')
    .isIn(['accepted' ,'rejected'  , 'pending' , 'negotiation'])
    .withMessage('Invalid quotation status requested') ,

    check('sortBy')
     .optional()
     .isString()
     .withMessage('Sort By should be a valid string')
     .isIn(['asc , desc'])
     .withMessage('Invalid sort by parameter') ,

    check('productIds')
    .optional()
    .isArray()
    .withMessage('Array should be an array') 
    .isLength({min:1})
    .withMessage('Product Ids should not be empty') ,

    check('productsIds.*')
    .isMongoId()
    .withMessage('Invalid product id') ,


    check('seen')
    .optional()
    .isBoolean()
    .withMessage("Seen should be a boolean") ,
    


     (req , res, next) =>validateRequest(req , res, next)





    

]


export const validateGetQuotationById = [
    param('quotationId')
    .exists()
    .withMessage('Quotation ID is required')
    .notEmpty()
    .withMessage('Quotation ID is required')
    .isMongoId()
    .withMessage('Invalid Quoatation ID') ,

    (req , res , next) =>validateRequest(req , res , next)
]