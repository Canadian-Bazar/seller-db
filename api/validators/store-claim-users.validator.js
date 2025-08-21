import  { check  , query} from 'express-validator';
import { paginationValidator } from './pagination.validator.js';
import validateRequest from '../utils/validateRequest.js';
import mongoose from 'mongoose';





export const validateGetStoreById = [
    check('id')
        .exists()
        .withMessage('Store ID is required')
        .bail()
        .isMongoId()
        .withMessage('Store ID must be a valid MongoDB ObjectId'),  
    (req, res, next) => validateRequest(req, res, next)
]

