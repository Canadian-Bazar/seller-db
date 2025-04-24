import express from 'express'
import * as mutateQuotationController from '../controllers/quotation.controller.js'
import * as mutateQuotationValidator from '../validators/quotation.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import  trimRequest  from 'trim-request';



const router = express.Router()
router.use(requireAuth)
router.use(trimRequest.all)


router.put('/:quotationId/:status' , mutateQuotationValidator.validateMutateQuotation , mutateQuotationController.mutateQuotationStatusController)

export default router