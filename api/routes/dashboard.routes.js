import express from 'express'

import * as dashboardControllers from '../controllers/dashboard.controller.js'
import  * as dashboardValidators from '../validators/dashboard.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'





const router = express.Router()
router.use(requireAuth)



router.get(
    '/' ,
    dashboardValidators.validateDashboardRoutes ,
    dashboardControllers.getDashboardStats

)




export default router ;