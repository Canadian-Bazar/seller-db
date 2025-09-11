import express from 'express';
import * as serviceAnalyticsController from '../controllers/service-analytics.controller.js';
import * as serviceAnalyticsValidator from '../validators/service-analytics.validator.js';
import trimRequest from 'trim-request';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(trimRequest.all);
router.use(requireAuth);

router.post(
  '/',
  serviceAnalyticsValidator.validateServiceAnalytics,
  serviceAnalyticsController.getServiceAnalytics
);

router.post(
  '/summary',
  serviceAnalyticsValidator.validateServiceAnalyticsSummary,
  serviceAnalyticsController.getServiceAnalyticsSummary
);

export default router;