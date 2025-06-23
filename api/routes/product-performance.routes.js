import express from 'express'

import * as productPerformanceController from '../controllers/product-performance.controller.js'
import * as productPerformanceValidator from '../validators/product-performace.validator.js'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)


router.post(
    '/' ,
    productPerformanceValidator.validateProductAnalytics ,
    productPerformanceController.getProductPerformanceAnalytics
)


router.post(
    '/summary',
    productPerformanceValidator.validateProductSummary,
    productPerformanceController.getProductPerformanceSummary
)



export default router 