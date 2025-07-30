import express from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as careerControllers from '../controllers/career.controller.js'
import * as careerValidators from '../validators/career.validator.js'




const router = express.Router()
router.use(requireAuth)


router.get(
    '/' ,
    careerValidators.validatedGetCareers,
    careerControllers.getVerifiedCareers
)




export default router 