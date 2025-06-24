import express from 'express'
import * as productsControllers from '../controllers/products.controller.js'
import * as productValidators from '../validators/products.validator.js'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'




const router  = express.Router()
router.use(trimRequest.all)
router.use(requireAuth)

router.get(
    '/' ,
    productValidators.validatedGetProducst ,
    productsControllers.getProductsController

)


    export default router
