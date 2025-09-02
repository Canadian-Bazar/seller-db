import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as serviceOrderValidators from '../validators/service-order.validators.js'
import * as serviceOrderControllers from '../controllers/service-orders.controller.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

// Get all service orders for seller
router.get(
    '/',
    serviceOrderValidators.getServiceOrdersValidator,
    serviceOrderControllers.getServiceOrders
)

// Get service order by ID
router.get(
    '/:orderId',
    serviceOrderValidators.getServiceOrderByIdValidator,
    serviceOrderControllers.getServiceOrderById
)

// Update service order status
router.put(
    '/:orderId/status',
    serviceOrderValidators.updateServiceOrderStatusValidator,
    serviceOrderControllers.updateServiceOrderStatus
)



export default router
