import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productImagesControllers from '../controllers/product-images.controller.js'
import * as productImageValidators from '../validators/product-images.validator.js'




const router = express.Router()


router.use(trimRequest.all) ,
router.use(requireAuth)


router.get(
    '/' ,
    productImageValidators.validateGetImages ,
    productImagesControllers.getProductImages
)


router.post(
    '/' ,
    productImageValidators.validateSyncImages ,
    productImagesControllers.syncImagesControllers
)


export default router