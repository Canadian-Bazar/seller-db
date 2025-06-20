import express from 'express'
import trimRequest from 'trim-request'

import * as authControllers from '../controllers/auth.controller.js'
import * as authValidators from '../validators/auth.validator.js'

const router = express.Router()


router.post(
  '/signup',
  trimRequest.all,
  authValidators.signupValidator,
  authControllers.signupController,
)

router.post(
  '/login' ,
  trimRequest.all , 
  authValidators.loginValidator ,
  authControllers.loginController
)

router.delete(
  '/logout' , 
  trimRequest.all ,
  authControllers.logoutController
)


router.post(
  '/send-otp' ,
  trimRequest.all,
  authValidators.sendOtpvalidator ,
  authControllers.sendOtpController
)

router.post(
  '/forgot-password-token',
  trimRequest.all,
  authValidators.generateForgotPasswordTokenValidator,
  authControllers.generateForgotPasswordTokenController
)

router.post(
  '/reset-password' ,
  trimRequest.all ,
  authValidators.resetPasswordValidator ,
  authControllers.resetPasswordController
)


router.post(
  '/verify-otp' ,
  trimRequest.all , 
  authValidators.verifyOtpValidator , 
  authControllers.verifyOtpController
)


router.get(
  '/verify-tokens' ,
  trimRequest.all ,
  authValidators.verifyTokensValidator ,
  authControllers.verifyTokensController
)

router.post(
  '/send-email-verification' ,
  trimRequest.all,
  authValidators.sendEmailVerificationValidator,
  authControllers.sendVerificationEmailOtp
)

router.post(
  '/verify-email-otp',
  trimRequest.all,
  authValidators.verifyEmailOtpValidator,
  authControllers.verifyEmailOtp
)


router.post(
  '/send-phone-verification' ,
  trimRequest.all,
  authValidators.sendPhoneNumberOtpValidator,
  authControllers.sendPhoneNumberOtp

)

router.post(
  '/verify-phone-otp',
  trimRequest.all,
  authValidators.verifyPhoneNumberOtpValidator,
  authControllers.verifyPhoneNumberOtp
)

router.post(
  '/resend-otp/email',
  trimRequest.all,
  authValidators.resendOtpvalidator,
  authControllers.resendEmailOtp
)


router.post(
  '/resend-otp/phone',
  trimRequest.all,
  authValidators.resendOtpvalidator,
  authControllers.resendPhoneOtp
)




export default router
