import express from 'express'
import trimRequest from 'trim-request'
import * as sellerInvoiceControllers from '../controllers/invoice.controller.js'
import * as sellerInvoiceValidators from '../validators/invoice.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(trimRequest.all)

router.post(
  '/generate',
  requireAuth,
  sellerInvoiceValidators.generateInvoiceValidator,
  sellerInvoiceControllers.generateInvoice
)

router.get(
  '/list',
  requireAuth,
  sellerInvoiceValidators.getSellerInvoicesValidator,
  sellerInvoiceControllers.getSellerInvoices
)

router.get(
  '/:invoiceId',
  requireAuth,
  sellerInvoiceValidators.getInvoiceByIdValidator,
  sellerInvoiceControllers.getInvoiceById
)

router.put(
  '/:invoiceId',
  requireAuth,
  sellerInvoiceValidators.updateInvoiceValidator,
  sellerInvoiceControllers.updateInvoice
)

router.delete(
  '/:invoiceId',
  requireAuth,
  sellerInvoiceValidators.deleteInvoiceValidator,
  sellerInvoiceControllers.deleteInvoice
)

export default router