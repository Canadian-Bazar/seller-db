import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productControllers from '../controllers/product-info.controller.js'
import * as productValidators from '../validators/product-info.validator.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.post(
    '/',
    productValidators.validateCreateProduct,
    productControllers.createProductController
)

router.put(
    '/:productId',
    productValidators.validateUpdateProduct,
    productControllers.updateProductInfoController
)

router.get(
    '/:productId',
    productValidators.validateGetProductInfo ,
    productControllers.getProductInfoController
)

export default router