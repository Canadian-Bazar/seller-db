import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productPricingValidators from '../validators/product-pricing.validator.js'
import * as productPricingControllers from '../controllers/product-pricing.controller.js'


const router = express.Router()


router.use(trimRequest.all)
router.use(requireAuth)



router.post(
    '/:productId' ,
    productPricingValidators.validateSyncProductPricing ,
    productPricingControllers.syncProductPricingController
    
)


router.get(
    '/:productId' ,
    productPricingValidators.validateGetProductPricing ,
    productPricingControllers.getProductPricingController
)


export default router