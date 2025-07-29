import  { check } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';
import { paginationValidator } from './pagination.validator.js';

export  const getSubscriptionPlansValidator =[
    ...paginationValidator ,
    (req , res , next)=>validateRequest(req , res, next)
]