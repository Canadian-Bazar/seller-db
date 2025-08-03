import express from 'express'
import * as websiteProjectControllers from '../controllers/website-project.controller.js'
import * as websiteProjectValidators from '../validators/website-project.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const websiteProjectRouter = express.Router()

websiteProjectRouter.use(requireAuth)

// Get all website projects with pagination
websiteProjectRouter.get(
   '/',
   websiteProjectValidators.validateGetAllWebsiteProjects,
   websiteProjectControllers.getAllWebsiteProjectsController
)

// Get single website project by ID
websiteProjectRouter.get(
   '/:id',
   websiteProjectValidators.validateGetWebsiteProjectById,
   websiteProjectControllers.getWebsiteProjectByIdController
)

// Update report only
websiteProjectRouter.put(
   '/:id',
   websiteProjectValidators.validateUpdateWebsiteProjectReport,
   websiteProjectControllers.updateWebsiteProjectReportController
)

export default websiteProjectRouter