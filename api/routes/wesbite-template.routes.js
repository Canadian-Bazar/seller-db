import express from 'express'
import * as websiteTemplateControllers from '../controllers/website-template.controller.js'
import * as websiteTemplateValidators from '../validators/website-template.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
const websiteTemplateRouter = express.Router()




websiteTemplateRouter.use(requireAuth)




websiteTemplateRouter.get(
    '/' ,
    websiteTemplateValidators.validateGetAllWebsiteTemplates,
    websiteTemplateControllers.getAllWebsiteTemplatesController
)


websiteTemplateRouter.post(
    '/',
    websiteTemplateValidators.validateCreateWebsiteTemplate,
    websiteTemplateControllers.createWebsiteTemplateController
)


websiteTemplateRouter.get(
    '/:id',
    websiteTemplateValidators.validateGetWebsiteTemplate,
    websiteTemplateControllers.getWebsiteTemplateController
)


export default websiteTemplateRouter