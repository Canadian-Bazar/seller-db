import express from 'express'
import * as websiteQuotationController from '../controllers/website-quotation.controller.js'
import * as websiteQuotationValidators from '../validators/website-quotation.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
const websiteQuotationRouter = express.Router()



websiteQuotationRouter.use(requireAuth)



websiteQuotationRouter.get(
    '/' ,
    websiteQuotationValidators.getWebsiteQuotations,
    websiteQuotationController.getAllWebsiteQuotationsController
)



websiteQuotationRouter.get(
    '/:id' ,
    websiteQuotationValidators.getWebsiteQuotationsById,
    websiteQuotationController.getWebsiteQuotationByIdController
)


websiteQuotationRouter.post(
  '/',
  websiteQuotationValidators.validateCreateWebsiteQuotation,
  websiteQuotationController.createWebsiteQuotationController
)




export default websiteQuotationRouter