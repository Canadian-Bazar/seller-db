import { matchedData } from "express-validator";
import { check , query } from "express-validator";



export const paginationValidator=[
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100') ,

    query('search')
    .optional()
    .notEmpty()
    .withMessage('Search cannot be empty')
    .isString()
    .withMessage('Search should be a string')
]