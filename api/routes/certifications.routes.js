import express from 'express';
import  trimRequest  from 'trim-request';

import * as certificationsController from '../controllers/certifications.controller.js'
import * as certificationsValidator from '../validators/certifications.validator.js'

const router = express.Router();
router.use(trimRequest.all);
router.get(
    '/' , 
    certificationsValidator.getCertificationsValidator ,
    certificationsController.getCertificationsController


);


export default router;