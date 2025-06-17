import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productPricingValidators from '../validators/product-pricing.validator.js'
import * as productPricingControllers from '../controllers/product-pricing.controller.js'


const router = express.Router()


router.use(trimRequest.all)
router.use(requireAuth)



router.post(
    '/' ,
    productPricingValidators.validateSyncProductPricing ,
    productPricingControllers.syncProductPricingController
    
)


export default router