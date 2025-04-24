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