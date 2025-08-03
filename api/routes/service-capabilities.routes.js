import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as serviceCapabilitiesValidators from '../validators/service-capabilities.validator.js'
import * as serviceCapabilitiesControllers from '../controllers/service-capabilities.controller.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.post(
    '/:serviceId',
    serviceCapabilitiesValidators.validateSyncServiceCapabilities,
    serviceCapabilitiesControllers.syncServiceCapabilitiesController
)

router.get(
    '/:serviceId',
    serviceCapabilitiesValidators.validateGetServiceCapabilities,
    serviceCapabilitiesControllers.getServiceCapabilitiesController
)

export default router