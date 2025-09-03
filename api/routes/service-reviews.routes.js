import * as serviceReviewController from '../controllers/service-reviews.controller.js';
import * as serviceReviewValidator from '../validators/service-reviews.validator.js';
import express from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js';
import trimRequest from 'trim-request';

const router = express.Router()

router.use(trimRequest.all)

// Get reviews by service ID
router.get(
    '/service',
    requireAuth,
    serviceReviewValidator.validateGetReviewsByServiceId,
    serviceReviewController.getReviewsByServiceId
)

// Get all service reviews for seller with filters
router.get(
    '/',
    requireAuth,
    serviceReviewValidator.validateGetAllServiceReviewsForSeller,
    serviceReviewController.getAllServiceReviewsForSeller
)

// Get service reviews analytics for seller
router.get(
    '/analytics',
    requireAuth,
    serviceReviewValidator.validateGetServiceReviewsAnalytics,
    serviceReviewController.getServiceReviewsAnalytics
)

export default router