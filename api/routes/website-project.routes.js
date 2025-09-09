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



websiteProjectRouter.patch(
   '/:id',
   websiteProjectValidators.validateUpdateWebsiteProjectSellerInputs,
   websiteProjectControllers.updateWebsiteProjectSellerInputsController
)



export default websiteProjectRouter