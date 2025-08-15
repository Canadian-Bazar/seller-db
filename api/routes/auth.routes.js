import express from 'express'
import trimRequest from 'trim-request'

import * as authControllers from '../controllers/auth.controller.js'
import * as authValidators from '../validators/auth.validator.js'
import {requireAuth} from '../middlewares/auth.middleware.js'

const router = express.Router()


router.use(trimRequest.all)


router.post(
  '/signup',
  authValidators.signupValidator,
  authControllers.signupController,
)

router.post(
  '/login' ,
  authValidators.loginValidator ,
  authControllers.loginController
)

router.delete(
  '/logout' , 
  authControllers.logoutController
)


router.post(
  '/send-otp' ,
  authValidators.sendOtpvalidator ,
  authControllers.sendOtpController
)

router.post(
  '/forgot-password-token',
  authValidators.generateForgotPasswordTokenValidator,
  authControllers.generateForgotPasswordTokenController
)




router.post(
  '/verify-otp' ,
  authValidators.verifyOtpValidator , 
  authControllers.verifyOtpController
)


router.get(
  '/verify-tokens' ,
  authValidators.verifyTokensValidator ,
  authControllers.verifyTokensController
)

router.post(
  '/send-email-verification' ,
  authValidators.sendEmailVerificationValidator,
  authControllers.sendVerificationEmailOtp
)

router.post(
  '/verify-email-otp',
  authValidators.verifyEmailOtpValidator,
  authControllers.verifyEmailOtp
)


router.post(
  '/send-phone-verification' ,
  authValidators.sendPhoneNumberOtpValidator,
  authControllers.sendPhoneNumberOtp

)

router.post(
  '/verify-phone-otp',
  authValidators.verifyPhoneNumberOtpValidator,
  authControllers.verifyPhoneNumberOtp
)

router.post(
  '/resend-otp/email',
  authValidators.resendOtpvalidator,
  authControllers.resendEmailOtp
)


router.post(
  '/resend-otp/phone',
  authValidators.resendOtpvalidator,
  authControllers.resendPhoneOtp
)



router.post(
  '/forgot-password',
  authValidators.forgotPasswordValidator,
  authControllers.forgotPasswordRequest
);

router.post(
  '/verify-forgot-password-otp',
  authValidators.verifyForgotPasswordOtpValidator,
  authControllers.verifyForgotPasswordOtp
);

router.post(
  '/reset-password',
  authValidators.resetPasswordValidator,
  authControllers.resetPassword
);



router.post(
  '/change-password' ,
  requireAuth ,

  
  authValidators.changePasswordValidator ,
  authControllers.changePasswordController
)


export default router


