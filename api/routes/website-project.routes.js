import express from 'express'
import * as websiteProjectControllers from '../controllers/website-project.controller.js'
import * as websiteProjectValidators from '../validators/website-project.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const websiteProjectRouter = express.Router()


websiteProjectRouter.use(requireAuth)




websiteProjectRouter.get(
   '/current-project' ,
   websiteProjectValidators.validateGetProjectStatus ,
   websiteProjectControllers.getCurrentProjectStatusController
)



websiteProjectRouter.put(
   '/:id/seller-inputs',
   websiteProjectValidators.validateUpdateWebsiteProjectSellerInputs,
   websiteProjectControllers.updateWebsiteProjectSellerInputsController
)

websiteProjectRouter.put(
   '/:id/seller',
   websiteProjectValidators.validateUpdateWebsiteProjectSeller,
   websiteProjectControllers.updateWebsiteProjectSellerController
)



export default websiteProjectRouter