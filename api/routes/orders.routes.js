import express from 'express'
import trimRequest from 'trim-request'
import * as orderControllers from '../controllers/orders.controller.js'
import * as orderValidators from '../validators/orders.validators.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)



router.get(
  '/:orderId',
  orderValidators.getOrderByIdValidator,
  orderControllers.getOrderById
)

router.get(
  '/',
  orderValidators.getSellerOrdersValidator,
  orderControllers.getOrders
)



// Update order status (seller only)
router.put(
  '/:orderId',
  orderValidators.updateOrderStatusValidator,
  orderControllers.updateOrderStatus
)



// Get all orders for seller




export default router