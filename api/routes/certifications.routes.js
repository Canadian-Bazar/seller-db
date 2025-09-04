import express from 'express';
import  trimRequest  from 'trim-request';

import * as certificationsController from '../controllers/certifications.controller.js'
import * as certificationsValidator from '../validators/certifications.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

const router = express.Router();
router.use(trimRequest.all);
router.get(
    '/' , 
    requireAuth,
    certificationsValidator.getCertificationsValidator ,
    certificationsController.getCertificationsController
);


export default router;