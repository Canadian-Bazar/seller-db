import express from 'express'
import trimRequest from 'trim-request'
import * as serviceInvoiceControllers from '../controllers/service-invoice.controller.js'
import * as serviceInvoiceValidators from '../validators/service-invoice.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

// Get service invoice details by token
router.post(
  '/',
  serviceInvoiceValidators.getServiceInvoiceDetailsValidator,
  serviceInvoiceControllers.getServiceInvoiceDetails
)

// Generate service invoice (seller)
router.post(
  '/generate',
  serviceInvoiceValidators.generateServiceInvoiceValidator,
  serviceInvoiceControllers.generateServiceInvoice
)

// Get seller service invoices


export default router