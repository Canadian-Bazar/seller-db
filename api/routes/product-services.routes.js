import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productServicesControllers from '../controllers/product-services.controller.js'
import * as productServicesValidators from '../validators/product-services.validator.js'




const router = express.Router()


router.use(trimRequest.all) ,
router.use(requireAuth)


router.get(
    '/' ,
    productServicesValidators.validateGetProductServices ,
    productServicesControllers.getProductServicesController
)


router.post(
    '/' ,
    productServicesValidators.validateCreateProductServices ,
    productServicesControllers.updateProductServicesController
)


export default router