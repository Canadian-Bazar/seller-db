import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as serviceCustomizationValidators from '../validators/service-customization.validator.js'
import * as serviceCustomizationControllers from '../controllers/service-customization.controller.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.post(
    '/:serviceId',
    serviceCustomizationValidators.validateSyncServiceCustomization,
    serviceCustomizationControllers.syncServiceCustomizationController
)

router.get(
    '/:serviceId',
    serviceCustomizationValidators.validateGetServiceCustomization,
    serviceCustomizationControllers.getServiceCustomizationController
)

export default router