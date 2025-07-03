import express from 'express'
import trimRequest from 'trim-request'
import * as orderControllers from '../controllers/order.controller.js'
import * as orderValidators from '../validators/order.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

// Get order by ID (accessible by both buyer and seller)
router.get(
  '/:orderId',
  orderValidators.getOrderByIdValidator,
  orderControllers.getOrderById
)

// Update order status (seller only)
router.put(
  '/:orderId/status',
  orderValidators.updateOrderStatusValidator,
  orderControllers.updateOrderStatus
)

// Get all orders for buyer
router.get(
  '/buyer/list',
  orderValidators.getBuyerOrdersValidator,
  orderControllers.getBuyerOrders
)

// Get all orders for seller
router.get(
  '/seller/list',
  orderValidators.getSellerOrdersValidator,
  orderControllers.getSellerOrders
)

// Cancel order (buyer only)
router.put(
  '/:orderId/cancel',
  orderValidators.cancelOrderValidator,
  orderControllers.cancelOrder
)

export default router