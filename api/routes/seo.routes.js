import express from 'express';
import trimRequest from 'trim-request';
import { setSeoHeadController } from '../controllers/seo.controller.js';

const router = express.Router();
router.use(trimRequest.all);

// Admin/editor endpoint to upsert SEO head snippet for a path
router.post('/', setSeoHeadController);

export default router;
