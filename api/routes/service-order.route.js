import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as serviceOrderValidators from '../validators/service-orders.validators.js'
import * as serviceOrderControllers from '../controllers/service-order.controller.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.post(
    '/:serviceId',
    serviceOrderValidators.validateSyncServiceOrder,
    serviceOrderControllers.syncServiceOrderController
)

router.get(
    '/:serviceId',
    serviceOrderValidators.validateGetServiceOrder,
    serviceOrderControllers.getServiceOrderController
)

export default router