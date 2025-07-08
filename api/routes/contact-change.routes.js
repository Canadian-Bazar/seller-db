
import express from 'express'
import * as contactChangeController from '../controllers/contact-change.controller.js'
import * as contactChangeValidator from '../validators/contact-change.validator.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import  trimRequest  from 'trim-request';

const router = express.Router()

router.use(requireAuth)
router.use(trimRequest.all)


router.post(
    '/initiate',
    contactChangeValidator.initiateContactChangeValidator,
    contactChangeController.initiateContactChangeController
)

router.post(
    '/verify-current',
    contactChangeValidator.verifyCurrentContactOtpValidator,
    contactChangeController.verifyCurrentContactOtpController
)


router.post(
    '/verify-new',
    contactChangeValidator.verifyNewContactOtpValidator,
    contactChangeController.verifyNewContactOtpController
)


router.post(
    '/resend-otp',
    contactChangeValidator.resendContactChangeOtpValidator,
    contactChangeController.resendContactChangeOtpController
)


export default router