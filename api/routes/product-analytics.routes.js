import express from 'express'
import* as productAnalyticsController from '../controllers/product-analytics.controller.js'
import * as productAnalyticsValidator from '../validators/product-analytics.validator.js'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)


router.post(
    '/' ,
    productAnalyticsValidator.validateProductAnalytics ,
    productAnalyticsController.getProductAnalytics

)


export default router