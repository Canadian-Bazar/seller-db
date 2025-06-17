import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productDescriptionValidators from '../validators/product-description.validator.js'
import * as productDescriptionControllers from '../controllers/product-description.controller.js'



const router = express.Router()
router.use(trimRequest.all)
router.use(requireAuth)


router.post(
    '/' ,
    productDescriptionValidators.validateSyncProductDescription ,
    productDescriptionControllers.syncProductDescriptionController
)


export default router 