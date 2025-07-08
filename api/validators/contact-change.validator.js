import { check, body } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import httpStatus from 'http-status';


export const initiateContactChangeValidator = [
  check('changeType')
    .exists()
    .withMessage('Change Type Is Required')
    .not()
    .isEmpty()
    .withMessage('Change Type Cannot Be Empty')
    .isIn(['email', 'phone'])
    .withMessage('Change Type Must Be Either Email Or Phone'),

  body()
    .custom((value, { req }) => {
      if (req.body.changeType === 'email' && !req.body.newEmail) {
        throw buildErrorObject(httpStatus.BAD_REQUEST, 'New Email Is Required For Email Change');
      }
      
      if (req.body.changeType === 'phone' && !req.body.newPhone) {
        throw buildErrorObject(httpStatus.BAD_REQUEST, 'New Phone Number Is Required For Phone Change');
      }

      if (req.body.changeType === 'email' && req.body.newPhone) {
        throw buildErrorObject(httpStatus.BAD_REQUEST, 'Only New Email Should Be Provided For Email Change');
      }

      if (req.body.changeType === 'phone' && req.body.newEmail) {
        throw buildErrorObject(httpStatus.BAD_REQUEST, 'Only New Phone Number Should Be Provided For Phone Change');
      }
      
      return true;
    }),

  check('newEmail')
    .if((value, { req }) => req.body.changeType === 'email')
    .exists()
    .withMessage('New Email Is Required For Email Change')
    .not()
    .isEmpty()
    .withMessage('New Email Cannot Be Empty')
    .isEmail()
    .withMessage('Invalid Email Format'),

  check('newPhone')
    .if((value, { req }) => req.body.changeType === 'phone')
    .exists()
    .withMessage('New Phone Number Is Required For Phone Change')
    .not()
    .isEmpty()
    .withMessage('New Phone Number Cannot Be Empty')
    .isMobilePhone()
    .withMessage('Invalid Phone Number Format'),

  (req, res, next) => validateRequest(req, res, next),
]

export const verifyCurrentContactOtpValidator = [
  check('sessionToken')
    .exists()
    .withMessage('Session Token Is Required')
    .not()
    .isEmpty()
    .withMessage('Session Token Cannot Be Empty'),

  check('otp')
    .exists()
    .withMessage('OTP Is Required')
    .not()
    .isEmpty()
    .withMessage('OTP Cannot Be Empty')
    .isLength({ min: 4, max: 4 })
    .withMessage('Invalid OTP')
    .isNumeric()
    .withMessage('Invalid OTP'),

  (req, res, next) => validateRequest(req, res, next),
]

export const verifyNewContactOtpValidator = [
  check('sessionToken')
    .exists()
    .withMessage('Session Token Is Required')
    .not()
    .isEmpty()
    .withMessage('Session Token Cannot Be Empty'),

  check('otp')
    .exists()
    .withMessage('OTP Is Required')
    .not()
    .isEmpty()
    .withMessage('OTP Cannot Be Empty')
    .isLength({ min: 4, max: 4 })
    .withMessage('Invalid OTP')
    .isNumeric()
    .withMessage('Invalid OTP'),

  (req, res, next) => validateRequest(req, res, next),
]

export const resendContactChangeOtpValidator = [
  check('sessionToken')
    .exists()
    .withMessage('Session Token Is Required')
    .not()
    .isEmpty()
    .withMessage('Session Token Cannot Be Empty'),

  check('otpType')
    .exists()
    .withMessage('OTP Type Is Required')
    .not()
    .isEmpty()
    .withMessage('OTP Type Cannot Be Empty')
    .isIn(['current', 'new'])
    .withMessage('OTP Type Must Be Either Current Or New'),

  (req, res, next) => validateRequest(req, res, next),
]