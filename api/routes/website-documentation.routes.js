import express from 'express'

import * as websiteDocumentationControllers from '../controllers/website-documentation.controller.js'
import * as websiteDocumentationValidators from '../validators/website-documentation.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
const websiteDocumentationRouter = express.Router()




websiteDocumentationRouter.use(requireAuth)




websiteDocumentationRouter.post(
    '/',
    websiteDocumentationValidators.validateCreateWebsiteDocumentation,
    websiteDocumentationControllers.createWebsiteDocumentationController
)


websiteDocumentationRouter.put(
    '/',
    websiteDocumentationValidators.validateGetWebsiteDocumentation,
    websiteDocumentationControllers.getWebsiteDocumentationController
)


export default websiteDocumentationRouter   