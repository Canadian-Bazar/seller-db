import express from 'express'
import trimRequest from 'trim-request'
import * as invoiceControllers from '../controllers/invoice.controller.js'
import * as invoiceValidators from '../validators/invoice.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(trimRequest.all)



// Seller routes (auth required)
router.use(requireAuth)

// Generate invoice (seller)

router.post(
  '/' ,
  invoiceValidators.getInvoiceDetailsValidator ,
  invoiceControllers.getInvoiceDetails
)


router.post(
  '/generate',
  invoiceValidators.generateInvoiceValidator,
  invoiceControllers.generateInvoice
)

// Get seller invoices
router.get(
  '/seller/list',
  invoiceValidators.getSellerInvoicesValidator,
  invoiceControllers.getSellerInvoices
)

// Get invoice by ID (seller)
router.get(
  '/seller/:invoiceId',
  invoiceValidators.getInvoiceByIdValidator,
  invoiceControllers.getInvoiceById
)

// Update invoice (seller)
router.put(
  '/seller/:invoiceId',
  invoiceValidators.updateInvoiceValidator,
  invoiceControllers.updateInvoice
)

// Delete invoice (seller)
router.delete(
  '/seller/:invoiceId',
  invoiceValidators.deleteInvoiceValidator,
  invoiceControllers.deleteInvoice
)

export default router