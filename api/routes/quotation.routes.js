import express from 'express'
import * as quotationController from '../controllers/quotation.controller.js'
import * as quotationValidator from '../validators/quotation.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import trimRequest from 'trim-request'

const router = express.Router()

router.use(requireAuth)
router.use(trimRequest.all)

router.get(
    '/',
    quotationValidator.validateGetQuotations,
    quotationController.getAllQuotationsController
)

router.get(
    '/:quotationId',
    quotationValidator.validateGetQuotationById,
    quotationController.getQuotationById
)

router.put(
    '/:quotationId/accepted',
    quotationValidator.validateAcceptQuotation,
    quotationController.acceptQuotationController
)

router.put(
    '/:quotationId/rejected',
    quotationValidator.validateRejectQuotation,
    quotationController.rejectQuotationController
)

router.put(
    '/:quotationId/negotiate',
    quotationValidator.validateNegotiateQuotation,
    quotationController.negotiateQuotationController
)

export default router