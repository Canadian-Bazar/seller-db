import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productAttributesValidators from '../validators/product-attributes.validator.js'
import * as productAttributesControllers from '../controllers/product-attributes.controller.js'


const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)



router.post(
    '/:productId' ,
    productAttributesValidators.validateSyncProductAttributes ,
    productAttributesControllers.syncProductAttributesController
    
)

router.get(
    '/:productId' ,
    productAttributesValidators.validateGetProductAttributes ,
    productAttributesControllers.getProductAttributesController
)


export default router