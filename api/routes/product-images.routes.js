import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as productImagesControllers from '../controllers/product-images.controller.js'
import * as productImageValidators from '../validators/product-images.validator.js'
import multer from 'multer'



const upload = multer({
  dest: 'uploads/', 
})





const router = express.Router()


router.use(trimRequest.all) ,
router.use(requireAuth)


router.get(
    '/:productId' ,

    productImageValidators.validateGetImages ,
    productImagesControllers.getProductImages
)


router.post(
    '/:productId' ,
     upload.array('files' , 10) ,
    productImageValidators.validateSyncImages ,
    productImagesControllers.syncImagesControllers
)


export default router