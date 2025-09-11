import express from 'express';
import * as servicePerformanceController from '../controllers/service-performance.controller.js';
import * as servicePerformanceValidator from '../validators/service-analytics.validator.js';
import trimRequest from 'trim-request';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(trimRequest.all);
router.use(requireAuth);

router.post(
  '/',
  servicePerformanceValidator.validateServicePerformanceAnalytics,
  servicePerformanceController.getServicePerformanceAnalytics
);

router.post(
  '/summary',
  servicePerformanceValidator.validateServiceAnalyticsSummary,
  servicePerformanceController.getServicePerformanceSummary
);

export default router;