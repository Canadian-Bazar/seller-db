import { check, body } from 'express-validator';
import validateRequest from '../utils/validateRequest.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import httpStatus from 'http-status';

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
];

export const loginValidator = [
  check('email')
    .optional()
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Invalid Email'),

  check('phoneNumber')
    .optional()
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
    .withMessage('Password cannot be empty'),

  body()
    .custom((value, { req }) => {
      if (!req.body.email && !req.body.phoneNumber) {
        throw buildErrorObject(httpStatus.BAD_REQUEST, 'Either email or phone number is required for login');
      }
      return true;
    }),

  (req, res, next) => validateRequest(req, res, next)
];

export const sendOtpvalidator = [
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty'),
  (req, res, next) => validateRequest(req, res, next)
];

// Forgot Password Validators
export const forgotPasswordValidator = [
  check('identifier')
    .exists()
    .withMessage('Email or phone number is required')
    .not()
    .isEmpty()
    .withMessage('Email or phone number cannot be empty')
    .custom((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Please provide a valid email or phone number');
      }
      return true;
    }),
  (req, res, next) => validateRequest(req, res, next)
];

export const verifyForgotPasswordOtpValidator = [
  check('otp')
    .exists()
    .withMessage('OTP is required')
    .not()
    .isEmpty()
    .withMessage('OTP cannot be empty')
    .isNumeric()
    .withMessage('OTP must be numeric')
    .isLength({ min: 4, max: 4 })
    .withMessage('OTP must be 4 digits'),
  check('sessionToken')
    .exists()
    .withMessage('Session token is required')
    .not()
    .isEmpty()
    .withMessage('Session token cannot be empty')
    .isUUID()
    .withMessage('Invalid session token format'),
  (req, res, next) => validateRequest(req, res, next)
];

export const resetPasswordValidator = [
  check('newPassword')
    .exists()
    .withMessage('New password is required')
    .not()
    .isEmpty()
    .withMessage('New password cannot be empty')
    .isStrongPassword()
    .withMessage(
      'Password must contain one digit, one special character, one uppercase letter with minimum length 8',
    ),
  check('sessionToken')
    .exists()
    .withMessage('Session token is required')
    .not()
    .isEmpty()
    .withMessage('Session token cannot be empty')
    .isUUID()
    .withMessage('Invalid session token format'),
  (req, res, next) => validateRequest(req, res, next)
];

export const resendForgotPasswordOtpValidator = [
  check('sessionToken')
    .exists()
    .withMessage('Session token is required')
    .not()
    .isEmpty()
    .withMessage('Session token cannot be empty')
    .isUUID()
    .withMessage('Invalid session token format'),
  (req, res, next) => validateRequest(req, res, next)
];

// Existing validators (keeping for completeness)
export const generateForgotPasswordTokenValidator = [
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Invalid email format'),
  (req, res, next) => validateRequest(req, res, next)
];

export const verifyOtpValidator = [
  check('otp')
    .exists()
    .withMessage('OTP is required')
    .not()
    .isEmpty()
    .withMessage('OTP cannot be empty')
    .isNumeric()
    .withMessage('OTP must be numeric'),
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Invalid email format'),
  (req, res, next) => validateRequest(req, res, next)
];

export const verifyTokensValidator = [
  (req, res, next) => validateRequest(req, res, next)
];

export const sendEmailVerificationValidator = [
  check('email')
    .exists()
    .withMessage('Email is required')
    .not()
    .isEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Invalid email format'),
  check('companyName')
  .exists()
  .withMessage('Company Name is required') 
  .notEmpty()
  .withMessage('Company Namd cannot empty') ,

  (req, res, next) => validateRequest(req, res, next)
];

export const verifyEmailOtpValidator = [
  check('otp')
    .exists()
    .withMessage('OTP is required')
    .not()
    .isEmpty()
    .withMessage('OTP cannot be empty')
    .isNumeric()
    .withMessage('OTP must be numeric'),
  check('sessionToken')
    .exists()
    .withMessage('Session token is required')
    .not()
    .isEmpty()
    .withMessage('Session token cannot be empty')
    .isUUID()
    .withMessage('Invalid session token format'),
  (req, res, next) => validateRequest(req, res, next)
];

export const sendPhoneNumberOtpValidator = [
  check('phoneNumber')
    .exists()
    .withMessage('Phone number is required')
    .not()
    .isEmpty()
    .withMessage('Phone number cannot be empty')
    .isMobilePhone()
    .withMessage('Invalid phone number format'),


 check('sessionToken')
    .exists()
    .withMessage('Session token is required')
    .not()
    .isEmpty()
    .withMessage('Session token cannot be empty')
    .isUUID()
    .withMessage('Invalid session token format'),

  check('password')
    .exists()
    .withMessage('Password is required')
    .not()
    .isEmpty()
    .withMessage('Password cannot be empty')
    .isStrongPassword()
    .withMessage('Password must be strong'),

  check('confirmPassword')
    .exists()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }) ,

  (req, res, next) => validateRequest(req, res, next)
];

export const verifyPhoneNumberOtpValidator = [
  check('otp')
    .exists()
    .withMessage('OTP is required')
    .not()
    .isEmpty()
    .withMessage('OTP cannot be empty')
    .isNumeric()
    .withMessage('OTP must be numeric'),
  check('sessionToken')
    .exists()
    .withMessage('Session token is required')
    .not()
    .isEmpty()
    .withMessage('Session token cannot be empty')
    .isUUID()
    .withMessage('Invalid session token format'),
  (req, res, next) => validateRequest(req, res, next)
];

export const resendOtpvalidator = [
  check('identifier')
    .exists()
    .withMessage('Email or phone number is required')
    .not()
    .isEmpty()
    .withMessage('Email or phone number cannot be empty'),
  (req, res, next) => validateRequest(req, res, next)
];



export const changePasswordValidator = [
  check('oldPassword')
    .exists({ checkFalsy: true })
    .withMessage('Old Password is required')
    .isString()
    .withMessage('Invalid Password'),

  check('newPassword')
    .exists({ checkFalsy: true })
    .withMessage('New Password is required')
    .isString()
    .withMessage('Invalid Password')
    .isStrongPassword()
    .withMessage('New password must contain one digit, one special character, one uppercase letter with minimum length 8'),

  body()
    .custom((value, { req }) => {
      if (req.body.oldPassword === req.body.newPassword) {
        throw new Error('New password must be different from old password');
      }
      return true;
    }),





  (req, res, next) => validateRequest(req, res, next)
];