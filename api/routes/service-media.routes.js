import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as serviceMediaValidators from '../validators/service-media.validator.js'
import * as serviceMediaControllers from '../controllers/service-media.controller.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.post(
    '/:serviceId',
    serviceMediaValidators.validateSyncServiceMedia,
    serviceMediaControllers.syncServiceMediaController
)

router.get(
    '/:serviceId',
    serviceMediaValidators.validateGetServiceMedia,
    serviceMediaControllers.getServiceMediaController
)

export default router