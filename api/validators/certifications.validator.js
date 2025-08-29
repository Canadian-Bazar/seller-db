import {check ,param , query} from 'express-validator';
import { paginationValidator } from './pagination.validator.js';
import validateRequest from '../utils/validateRequest.js';


export const getCertificationsValidator =[
    ...paginationValidator ,

    (req , res, next) => validateRequest(req , res , next)
]
