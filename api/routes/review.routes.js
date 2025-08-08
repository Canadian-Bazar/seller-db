import * as reviewController from '../controllers/review.controller.js';
import * as reviewValidator from '../validators/review.validator.js';
import express from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js';
import trimRequest from 'trim-request';

const router = express.Router()

router.use(trimRequest.all)

// Get reviews by product ID
router.get(
    '/product',
    requireAuth,
    reviewValidator.validateGetReviewsByProductId,
    reviewController.getReviewsByProductId
)

// Get all reviews for seller with filters
router.get(
    '/',
    requireAuth,
    reviewValidator.validateGetAllReviewsForSeller,
    reviewController.getAllReviewsForSeller
)

// Get reviews analytics for seller
router.get(
    '/analytics',
    requireAuth,
    reviewValidator.validateGetReviewsAnalytics,
    reviewController.getReviewsAnalytics
)

export default router