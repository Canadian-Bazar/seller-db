import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as servicePricingValidators from '../validators/service-pricing.validator.js'
import * as servicePricingControllers from '../controllers/service-pricing.controller.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.post(
    '/:serviceId',
    servicePricingValidators.validateSyncServicePricing,
    servicePricingControllers.syncServicePricingController
)

router.get(
    '/:serviceId',
    servicePricingValidators.validateGetServicePricing,
    servicePricingControllers.getServicePricingController
)

export default router