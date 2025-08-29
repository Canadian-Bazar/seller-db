import express from 'express'
import * as serviceQuotationController from '../controllers/service-quotation.controller.js'
import * as serviceQuotationValidator from '../validators/service-quotation.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import trimRequest from 'trim-request'

const router = express.Router()

router.use(requireAuth)
router.use(trimRequest.all)

router.get(
    '/',
    serviceQuotationValidator.validateGetServiceQuotations,
    serviceQuotationController.getAllServiceQuotationsController
)

router.get(
    '/:quotationId',
    serviceQuotationValidator.validateGetServiceQuotationById,
    serviceQuotationController.getServiceQuotationById
)

router.put(
    '/:quotationId/accepted',
    serviceQuotationValidator.validateAcceptServiceQuotation,
    serviceQuotationController.acceptServiceQuotationController
)

router.put(
    '/:quotationId/rejected',
    serviceQuotationValidator.validateRejectServiceQuotation,
    serviceQuotationController.rejectServiceQuotationController
)

router.put(
    '/:quotationId/negotiate',
    serviceQuotationValidator.validateNegotiateServiceQuotation,
    serviceQuotationController.negotiateServiceQuotationController
)

export default router