import express from 'express'
import * as quotationController from '../controllers/quotation.controller.js'
import * as quotationValidator from '../validators/quotation.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import  trimRequest  from 'trim-request';



const router = express.Router()
router.use(requireAuth)
router.use(trimRequest.all)


router.get(
    '/' ,
    quotationValidator.validatedGetQuotations ,
    quotationController.getAllQuotationsController


)

router.get(
    '/:quotationId' ,
    quotationValidator.validateGetQuotationById ,
    quotationController.getQuotationById
)





router.put(
    '/:quotationId/:status' ,
     quotationValidator.validateMutateQuotation , 
     quotationController.mutateQuotationStatusController
    )

export default router