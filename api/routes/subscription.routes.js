import express from 'express'
import * as subscriptionValidators from '../validators/subscription.validator.js'
import * as subscriptionControllers from '../controllers/subscription.controller.js'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'


const router = express.Router()


router.use(trimRequest.all)
router.use(requireAuth )


router.get(
    '/' ,
    subscriptionValidators.getSubscriptionPlansValidator ,
    subscriptionControllers.getSubscriptionPlans
)

export default router

