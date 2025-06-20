import { check } from 'express-validator'

import validateRequest from '../utils/validateRequest.js'

export const signupValidator = [
  check('fullName')
    .exists()
    .withMessage('Full Name Is Required')
    .not()
    .isEmpty()
    .withMessage('Full Name Cannot Be Empty')
    .isAlphanumeric()
    .withMessage('Name cannot contain numbers'),

  check('email')
    .exists()
    .withMessage('Email Is Required')
    .not()
    .isEmpty()
    .withMessage('Email Cannot Be Empty')
    .isEmail()
    .withMessage('Email is invalid'),

  check('phoneNumber')
    .exists()
    .withMessage('Phone Number is Required')
    .not()
    .isEmpty()
    .withMessage('Phone Number Be Empty') 
    .isMobilePhone()
    .withMessage('Phone Number is Invalid'),

  check('password')
    .isStrongPassword()
    .withMessage(
      'Password must conntain one digit , one special character , one uppercase letter with minimum length 8',
    ),

  (req, res, next) => validateRequest(req, res, next),
]

export const loginValidator = [
  check('email')
    .exists()
    .withMessage('Email Is Required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Invalid Email'),

  check('password')
    .exists()
    .withMessage('Password is required')
    .not()
    .isEmpty()
    .withMessage('Password cannot be empty'),

  (req, res, next) => validateRequest(req, res, next)
]

export const sendOtpvalidator = [
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty'),

  (req, res, next) => validateRequest(req, res, next)
]

export const verifyOtpValidator = [
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty'),

  check('otp')
    .exists()
    .withMessage('OTP is Required')
    .not()
    .isEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('Invalid OTP')
    .isNumeric()
    .withMessage('Invalid OTP'),

  (req, res, next) => validateRequest(req, res, next)
]

export const generateForgotPasswordTokenValidator = [
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty'),

  (req, res, next) => validateRequest(req, res, next)
]

export const resetPasswordValidator = [
  check('forgotToken')
    .exists()
    .withMessage('Forgot Password Token Is Required')
    .not()
    .isEmpty()
    .withMessage('Missing Token'),

  check('newPassword')
    .exists()
    .withMessage('Password is required')
    .not()
    .isEmpty()
    .withMessage('Password cannot be empty')
    .isStrongPassword()
    .withMessage(
      'Password must conntain one digit , one special character , one uppercase letter with minimum length 8',
    ),

  (req, res, next) => validateRequest(req, res, next)
]


export const verifyTokensValidator =[
  (req , res , next)=>validateRequest(req , res , next)
]


export const sendEmailVerificationValidator = [
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty'),
  check('companyName')
    .exists()
    .withMessage('Name is required') 
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isString()
    .withMessage('Name should be a string') ,

  (req, res, next) => validateRequest(req, res, next)
]


export const verifyEmailOtpValidator = [
  check('sessionToken')
    .exists()
    .withMessage('Token is required')
    .not()
    .isEmpty()
    .withMessage('Token cannot be empty'),

  check('otp')
    .exists()
    .withMessage('OTP is Required')
    .not()
    .isEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('Invalid OTP')
    .isNumeric()
    .withMessage('Invalid OTP'),

  (req, res, next) => validateRequest(req, res, next)
]


export const sendPhoneNumberOtpValidator = [
  check('phoneNumber')
    .exists()
    .withMessage('Phone Number is required')
    .not()
    .isEmpty()
    .withMessage('Phone Number cannot be empty')
    .isMobilePhone()
    .withMessage('Invalid Phone Number'),

  check('password')
    .exists()
    .withMessage('Password is required')
    .not()
    .isEmpty()
    .withMessage('Password cannot be empty')
    .isStrongPassword()
    .withMessage(
      'Password must contain one digit, one special character, one uppercase letter with minimum length 8'
    ),

  check('confirmPassword')
    .exists()
    .withMessage('Confirm Password is required')
    .not()
    .isEmpty()
    .withMessage('Confirm Password cannot be empty')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),

    check('sessionToken')
      .exists()
      .withMessage('Token is required')
      .not()
      .isEmpty()
      .withMessage('Token cannot be empty'),

  (req, res, next) => validateRequest(req, res, next)
]

export const verifyPhoneNumberOtpValidator = [
  check('sessionToken')
    .exists()
    .withMessage('Token  is required')
    .not()
    .isEmpty()
    .withMessage('Token cannot be empty'),

  check('otp')
    .exists()
    .withMessage('OTP is Required')
    .not()
    .isEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('Invalid OTP')
    .isNumeric()
    .withMessage('Invalid OTP'),

  (req, res, next) => validateRequest(req, res, next)
]



export const resendOtpvalidator =[
  check('sessionToken')
    .exists()
    .withMessage('Session Token is required')
    .not()
    .isEmpty()
    .withMessage('Session Token cannot be empty'),

    (req, res, next) => validateRequest(req, res, next)
]