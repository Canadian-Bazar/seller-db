import express from 'express'

import * as claimStoreValidator from '../validators/store-claim-users.validator.js'
import * as claimStoreController from '../controllers/store-claim.controllers.js'
import   trimRequest  from 'trim-request';



const storeRoutes = express.Router()



storeRoutes.get(
               '/:id' ,
               trimRequest.all ,
               claimStoreValidator.validateGetStoreById ,
               claimStoreController.getStoreByIdController
 )




export default storeRoutes

