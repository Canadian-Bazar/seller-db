import express from 'express'
import trimRequest from 'trim-request';
import { requireAuth } from '../middlewares/auth.middleware.js';
import * as productVariationsController from '../controllers/product-variations.controller.js'
import * as productVariationsValidator from '../validators/product-variations.validator.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.post(
    '/:productId' ,
    productVariationsValidator.validateSyncProductVariations ,
    productVariationsController.syncProductVariationsController

)


router.get(
    '/' ,
    productVariationsValidator.validateGetProductVariations,
    productVariationsController.getProductVariationsController
)

export default router
