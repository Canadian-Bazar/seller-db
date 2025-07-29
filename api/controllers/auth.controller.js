import bcrypt from 'bcrypt'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status'
import jwt from 'jsonwebtoken'
import otpGenerator from 'otp-generator'

import sendMail from '../helpers/sendMail.js'
import Roles from '../models/role.schema.js'
import Seller from '../models/seller.schema.js'
import Verifications from '../models/verification.schema.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import buildResponse from '../utils/buildResponse.js'
import decrypt from '../utils/decrypt.js'
import generateForgotToken from '../utils/generate-forgot-token.js'
import generateTokens from '../utils/generateTokens.js'
import handleError from '../utils/handleError.js'
import isIDGood from '../utils/isIDGood.js'
import { getSignupBody } from '../helpers/getSignupBody.js'
import { sendTextMessage } from '../helpers/sendTextMessage.js'
import { v4 as uuidv4 } from 'uuid';
import SellerVerification from '../models/seller-verification.schema.js'
import getCookieOptions from '../utils/getCookieOptions.js'
import detectIdentifierType from '../helpers/detectIdentifierType.js'
import ForgotPassword from '../models/seller-forgot-password.schema.js'

/**
 * Controller: signupController
 * Description: Handles seller registration by creating a new seller in the database.
 * Flow
 * * 1. Validate incoming request data using matchedData.
 * * 2. Check if a seller with the provided email already exists.
 * * 3. If a seller exists, throw a conflict error.
 * * 4.Send an email dfor 
 * *5
*/
export const signupController = async (req, res) => {
  try {
    req = matchedData(req)
    const existingSeller = await Seller.findOne({ email: req.email }).lean()
    if (existingSeller?._id) {
      throw buildErrorObject(httpStatus.CONFLICT, 'User Already Exists')
    }

    const sellerRole = await Roles.findOne({ role: 'seller' }).lean()
    if (!sellerRole) {
      throw buildErrorObject(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Unable to assign seller role. Please try again later.'
      )
    }
    req.roleId = sellerRole._id

    await Seller.create(req)

    res.status(httpStatus.CREATED).json(buildResponse(httpStatus.CREATED, 
     'Seller Created Successfully',
    ))
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Controller: loginController
 * Description: Authenticates a seller and generates access and refresh tokens.
 */
export const loginController = async (req, res) => {
  try {
    req = matchedData(req)
    let seller = await Seller.findOne({
      $or: [
      { email: req.email },
      { phone: req.phoneNumber }
      ]
    }).select('password loginAttempts blockExpires approvalStatus')



    console.log(seller)
     console.log(req)
    console.log(seller)

    if (!seller?._id) {
      throw buildErrorObject(httpStatus.UNAUTHORIZED, 'No Such Seller Exists')
    }

    if (seller.approvalStatus !== 'approved') {
      throw buildErrorObject(
        httpStatus.UNAUTHORIZED, 
        `Your seller account's approval is ${seller.approvalStatus}.`
      )
    }

    if (!await bcrypt.compare(req.password, seller.password)) {
      const loginAttempts = seller.loginAttempts || 0 + 1
      const blockExpires = new Date(new Date().getTime() + 30 * 60000)
      if (seller.blockExpires > new Date()) {
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'USER BLOCKED')
      }

      if (loginAttempts >= 5) {
        seller.loginAttempts = loginAttempts
        seller.blockExpires = blockExpires
        await seller.save()
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'USER BLOCKED')
      }

      seller.loginAttempts = loginAttempts
      await seller.save()
      throw buildErrorObject(httpStatus.UNAUTHORIZED, 'INVALID CREDENTIALS')
    }

    if (seller.blockExpires > new Date()) {
      throw buildErrorObject(httpStatus.UNAUTHORIZED, 'USER BLOCKED')
    }
    seller.loginAttempts = 0
    await seller.save()
    seller = await Seller.findById(seller._id).lean().select('companyName  isVerified isProfileComplete  logo email')
    if (!seller) {
      throw buildErrorObject(httpStatus.UNAUTHORIZED, 'No Such Seller Exists')
    }
    seller.role = 'seller'
    const { accessToken, refreshToken } = generateTokens(seller)
    res
       .cookie('accessToken', accessToken, getCookieOptions())
      .cookie('refreshToken', refreshToken, getCookieOptions())
      .status(httpStatus.ACCEPTED)
      .json(buildResponse(httpStatus.ACCEPTED, seller))

  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Controller: logoutController
 * Description: Logs out the seller by clearing authentication cookies.
 */
export const logoutController = async (req, res) => {
  try {
    res
      .clearCookie('accessToken', getCookieOptions())
      .clearCookie('refreshToken', getCookieOptions())
      .status(httpStatus.NO_CONTENT)
      .json(buildResponse(httpStatus.NO_CONTENT))
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Controller: verifyTokensController
 * Description: Verifies the validity of the seller's access and refresh tokens.
 */
export const verifyTokensController = async (req, res) => {
  try {
    let accessToken = req.cookies.accessToken
    let refreshToken = req.cookies.refreshToken

    if (!accessToken) {
      throw buildErrorObject(httpStatus.UNAUTHORIZED, 'ACCESS_TOKEN_MISSING')
    }

    accessToken = decrypt(accessToken)

    try {
      let seller = jwt.verify(accessToken, process.env.AUTH_SECRET)
      
      seller = {
        _id: seller._id,
        email: seller.email,
        companyName: seller.companyName,
        companyLogo: seller.logo,
        isVerified: seller.isVerified || false,
        isProfileComplete: seller.isProfileComplete || false,
        role: seller.role,
      }

      res
        .status(httpStatus.OK)
        .json(buildResponse(httpStatus.OK, {
          success: true,
          message: 'Access token is valid',
          user : seller
        }))
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        if (!refreshToken) {
          throw buildErrorObject(httpStatus.UNAUTHORIZED, 'REFRESH_TOKEN_MISSING')
        }

        refreshToken = decrypt(refreshToken)

        try {
          let seller = jwt.verify(refreshToken, process.env.REFRESH_SECRET)

          seller = {
            _id: seller._id,
            email: seller.email,
            companyName: seller.companyName,
            companyLogo: seller.logo,
            isVerified: seller.isVerified || false,
            isProfileComplete: seller.isProfileComplete || false,
            role: seller.role,
          }

          const { accessToken } = generateTokens(seller)

          res
            .cookie('accessToken', accessToken, getCookieOptions())
            .status(httpStatus.CREATED)
            .json(buildResponse(httpStatus.CREATED, {
              success: true,
              message: 'Access token generated successfully',
              user : seller
            }))
        } catch (err) {
          throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Session expired, please login again to continue')
        }
      } else {
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Tokens were malformed')
      }
    }
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Controller: sendOtpController
 * Description: Sends an OTP (One Time Password) to the seller's email for verification.
 */
export const sendOtpController = async (req, res) => {
  try {
    const requestData = matchedData(req)

    const seller = await Seller.findOne({
      email: requestData.email.toString(),
    }).lean()
    if (seller?._id) {
      throw buildErrorObject(httpStatus.CONFLICT, 'Seller Already Exists')
    }

    const otp = otpGenerator.generate(4, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
      digits: true,
    })

    const validTill = new Date(new Date().getTime() + 30 * 60000)

    sendMail(requestData.email, 'register.ejs', {
      subject: 'Verification OTP',
      otp,
    })

    await Verifications.findOneAndUpdate(
      { email: requestData.email },
      { otp, validTill },
      { upsert: true }
    )

    res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.OK, { message: 'OTP_SENT' }))
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Controller: verifyOtpController
 * Description: Verifies a seller's OTP (One Time Password).
 */
export const verifyOtpController = async(req, res) => {
  try {
    req = matchedData(req)

    const verification = await Verifications.findOne({ email: req.email })
    if (!verification) {
      throw buildErrorObject(
        httpStatus.NOT_FOUND,
        'No OTP found for this email. Please request a new OTP.'
      )
    }

    if (parseInt(req.otp) !== parseInt(verification.otp)) {
      throw buildErrorObject(
        httpStatus.UNAUTHORIZED,
        'The OTP you entered is incorrect. Please try again.'
      )
    }

    // For existing sellers, update verification status
    const seller = await Seller.findOne({ email: req.email })
    if (seller) {
      seller.isVerified = true
      await seller.save()
    }

    res.status(httpStatus.ACCEPTED).json(
      buildResponse(httpStatus.ACCEPTED, {
        message: 'Verification successful. Your account is now verified.',
      })
    )
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Controller: generateForgotPasswordTokenController
 * Description: Handles the "forgot password" functionality for sellers.
 */
export const generateForgotPasswordTokenController = async(req, res) => {
  try {
    req = matchedData(req)

    const seller = await Seller.findOne({email: req.email}).select('_id email companyName').lean()
    
    if (seller) {
      const forgotPasswordToken = generateForgotToken(seller) 

      sendMail(req.email, 'forgot-password.ejs', {
        token: forgotPasswordToken,
        subject: 'Forgot password',
        companyName: seller.companyName,
        frontendURL: process.env.FRONTEND_URL,
      })
    }

    // Always return success to prevent email enumeration
    res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, {
        message: 'Reset Password Link Sent Successfully'
      }))
  } catch(err) {
    handleError(res, err)
  }
}

/**
 * Controller: resetPasswordController
 * Description: Handles the "reset password" functionality for sellers.
 */
export const resetPasswordController = async(req, res) => {
  try {
    req = matchedData(req)
    const {forgotToken, newPassword} = req 
    const decryptedToken = decrypt(forgotToken)

    let seller 
    
    try {
      seller = jwt.verify(decryptedToken, process.env.FORGOT_SECRET)
    } catch(err) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        buildResponse(httpStatus.UNAUTHORIZED, {
          success: false,
          message: 'Token Expired'
        })
      )
    }

    const sellerId = await isIDGood(seller._id)
    seller = await Seller.findById(sellerId)
    
    if (!seller) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Seller not found')
    }
    
    seller.password = newPassword
    await seller.save()

    res.status(httpStatus.ACCEPTED).json(
      buildResponse(httpStatus.ACCEPTED, {
        success: true,
        message: 'Password Changed Successfully'
      })
    )
  } catch(err) {
    handleError(res, err)
  }
}




export const sendVerificationEmailOtp = async(req , res)=>{
   try {
        const validatedData = matchedData(req);
        const { companyName, email } = validatedData;

        const sellerExists = await Seller.findOne({ email }).lean();
        if (sellerExists) {
            throw buildErrorObject(httpStatus.CONFLICT, 'Seller already registered with this email');
        }

        const sessionToken = uuidv4();

        const emailOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        const verification = await SellerVerification.findOneAndUpdate(
            { email },
            {
                companyName,
                email,
                emailOtp: parseInt(emailOtp),
                emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
                emailOtpAttempts: 0,
                sessionToken,
                currentStep: 'email_verification'
            },
            { upsert: true, new: true }
        );

        console.log(verification)

        await sendMail(email, 'send-email-otp.ejs', {
            otp: emailOtp,
            companyName,
            subject: 'Verify Your Email - Company Registration'
        });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK,  {
                sessionToken,
                step: 'email_verification',
                email: email.replace(/(.{2}).*(@.*)/, '$1***$2') 
            })
        );

    } catch (err) {
        handleError(res, err);
    }
}


export const verifyEmailOtp = async(req , res)=>{
  try{
    const validatedData = matchedData(req)
   const {otp , sessionToken}=validatedData
   const verification = await SellerVerification.findOne({sessionToken})
   if(!verification){
     throw buildErrorObject(httpStatus.NOT_FOUND , 'No session found. Please resend the OTP')
   }
   if(verification.emailOtpVerified){
     throw buildErrorObject(httpStatus.BAD_REQUEST , 'Email already verified')
   }

   if(verification.emailOtpExpiry < new Date()){
     throw buildErrorObject(httpStatus.UNAUTHORIZED , 'OTP expired. Please resend the OTP')
   }
   if(verification.emailOtp !== parseInt(otp)){
     throw buildErrorObject(httpStatus.UNAUTHORIZED , 'Invalid OTP')
   }
   verification.emailOtpVerified = true

    verification.currentStep = 'phone_verification'

      verification.isEmailVerified = true;
        verification.currentStep = 'phone_verification';
        verification.emailOtpAttempts = 0; 
        console.log(verification)

      await verification.save();   

    // Respond with session token and next step
        
        
        res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK , {
        step: 'phone_verification',
        sessionToken: verification.sessionToken
      })
    )
  }catch(err){
    handleError(res , err)
  }
}


export const sendPhoneNumberOtp = async(req , res)=>{
  try{
       const validatedData = matchedData(req);
        const { sessionToken, phoneNumber, password } = validatedData;

        const verification = await SellerVerification.findOne({ sessionToken });

        console.log(verification)
        if (!verification) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid session. Please start signup again.');
        }

        if (verification.currentStep !== 'phone_verification') {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Please complete email verification first.');
        }

        if (!verification.isEmailVerified) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Please verify your email first.');
        }

        const sellerExists = await Seller.findOne({ phoneNumber }).lean();
        if (sellerExists) {
            throw buildErrorObject(httpStatus.CONFLICT, 'Seller already registered with this phone number');
        }

        const phoneOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        const hashedPassword = await bcrypt.hash(password, 12);

        verification.phoneNumber = phoneNumber;
        verification.password = hashedPassword;
        verification.phoneNumberOtp = parseInt(phoneOtp);
        verification.phoneOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); 
        verification.phoneOtpAttempts = 0;
        await verification.save();

        const body = getSignupBody(phoneOtp);
        console.log('Phone OTP:', phoneOtp);

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK , {
                sessionToken,
                step: 'phone_verification',
                phoneNumber: phoneNumber.replace(/(\d{2})\d+(\d{2})/, '$1****$2')
            })
        );
  }catch(err){
    handleError(res , err)
  }
}


export const verifyPhoneNumberOtp = async(req , res)=>{
try {
        const validatedData = matchedData(req);
        const { sessionToken, otp } = validatedData;

        const verification = await SellerVerification.findOne({ sessionToken });
        if (!verification) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid session. Please start signup again.');
        }

        console.log(verification)

        if (verification.currentStep !== 'phone_verification') {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid step in signup flow.');
        }

        if (!verification.isEmailVerified) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Email verification incomplete.');
        }

        if (verification.phoneOtpExpiry < new Date()) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'OTP expired. Please request a new one.');
        }

        if (verification.phoneOtpAttempts >= 5) {
            throw buildErrorObject(httpStatus.TOO_MANY_REQUESTS, 'Too many invalid attempts. Please start signup again.');
        }

        if (parseInt(verification.phoneNumberOtp) !== parseInt(otp)) {
            verification.phoneOtpAttempts += 1;
            await verification.save();
            throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Invalid OTP');
        }
        

        const newSeller = new Seller({
            companyName: verification.companyName,
            email: verification.email,
            phone: verification.phoneNumber,
            password: verification.password,
          
        });

        await newSeller.save();

        verification.isPhoneNumberVerified = true;
        verification.currentStep = 'completed';
        await verification.save();


        res.status(httpStatus.CREATED).json(
            buildResponse(httpStatus.CREATED, 
               'Seller registered successfully',
            )
        );




  }catch(err){
    handleError(res , err)
  }
}

export const resendEmailOtp = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { sessionToken } = validatedData;

        const verification = await SellerVerification.findOne({ sessionToken });
        if (!verification) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid session. Please start signup again.');
        }

        const emailOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        verification.emailOtp = parseInt(emailOtp);
        verification.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        verification.emailOtpAttempts = 0;
        await verification.save();

        await sendMail(verification.email, 'send-email-otp.ejs', {
            otp: emailOtp,
            companyName: verification.companyName,
            subject: 'Resend: Verify Your Email'
        });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Email OTP resent successfully')
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const resendPhoneOtp = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { sessionToken } = validatedData;

        const verification = await SellerVerification.findOne({ sessionToken });
        if (!verification || verification.currentStep !== 'phone_verification') {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid session or step.');
        }

        const phoneOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        verification.phoneNumberOtp = parseInt(phoneOtp);
        verification.phoneOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        verification.phoneOtpAttempts = 0;
        await verification.save();

        const body = getSignupBody(phoneOtp);
        console.log('Resend Phone OTP:', phoneOtp);

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Phone OTP resent successfully')
        );

    } catch (err) {
        handleError(res, err);
    }
};



//change and forgot password



export const changePasswordController = async(req , res)=>{
  try{

    const validatedData = matchedData(req)


    const {oldPassword , newPassword} = validatedData

    const userId = req.user._id


    console.log(userId)

    const seller = await Seller.findById(userId).select('password')

    if(!seller){
      throw buildErrorObject(httpStatus.NOT_FOUND , 'No such seller exists')
    }


    if(await bcrypt.compare(oldPassword , seller.password)){

      const hashedPassword  = await bcrypt.hash(newPassword ,10 )

      seller.password = hashedPassword

      await seller.save()


      return res.status(httpStatus.ACCEPTED).json(buildResponse(httpStatus.ACCEPTED , 'Password changed successfully'))

    }else{
      throw buildErrorObject(httpStatus.BAD_REQUEST , 'Invalid Password')
    }


  }catch(err){
    handleError(res ,err)
  }
}





export const forgotPasswordRequest = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { identifier } = validatedData; 

        const identifierType = detectIdentifierType(identifier);

        console.log(identifierType , identifier)
        
        const seller = await Seller.findOne(
          identifierType === 'email'
            ? { email: identifier }
            : { phone: identifier }
        );
        if (!seller) {
            const message = identifierType === 'email' 
                ? 'No seller found with this email' 
                : 'No seller found with this phone number';
            throw buildErrorObject(httpStatus.NOT_FOUND, message);
        }

        const sessionToken = uuidv4();

        const otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        const forgotPasswordRecord = await ForgotPassword.findOneAndUpdate(
            { sellerId: seller._id },
            {
                sellerId: seller._id,
                identifier,
                identifierType,
                otp: parseInt(otp),
                otpExpiry: new Date(Date.now() + 10 * 60 * 1000), 
                attempts: 0,
                sessionToken,
                isVerified: false
            },
            { upsert: true, new: true }
        );

        if (identifierType === 'email') {
            await sendMail(identifier, 'forgot-password-otp.ejs', {
                otp,
                companyName: seller.companyName,
                subject: 'Reset Your Password - OTP Verification'
            });
        } else {
            const smsBody = getSignupBody(otp);
            console.log('Forgot Password SMS OTP:', otp);
            // await sendSMS(identifier, smsBody);
        }

        const maskedIdentifier = identifierType === 'email' 
            ? identifier.replace(/(.{2}).*(@.*)/, '$1***$2')
            : identifier.replace(/(\d{2})\d+(\d{2})/, '$1****$2');

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                sessionToken,
                identifierType,
                identifier: maskedIdentifier,
                message: `OTP sent to your ${identifierType === 'email' ? 'email' : 'phone'}`,
                expiresIn: '10 minutes'
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};



export const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { otp, sessionToken } = validatedData;

        const forgotPasswordRecord = await ForgotPassword.findOne({ sessionToken });
        if (!forgotPasswordRecord) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invalid session. Please request OTP again');
        }

        if (forgotPasswordRecord.isVerified) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'OTP already verified. Please reset your password');
        }

        if (forgotPasswordRecord.otpExpiry < new Date()) {
            throw buildErrorObject(httpStatus.UNAUTHORIZED, 'OTP expired. Please request a new one');
        }

        if (forgotPasswordRecord.attempts >= 5) {
            throw buildErrorObject(httpStatus.TOO_MANY_REQUESTS, 'Too many invalid attempts. Please request OTP again');
        }

        if (forgotPasswordRecord.otp !== parseInt(otp)) {
            forgotPasswordRecord.attempts += 1;
            await forgotPasswordRecord.save();

            throw buildErrorObject(httpStatus.UNAUTHORIZED, `Invalid OTP. ${5 - forgotPasswordRecord.attempts} attempts remaining`);
        }

        forgotPasswordRecord.isVerified = true;
        forgotPasswordRecord.attempts = 0;
        await forgotPasswordRecord.save();

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                sessionToken,
                message: 'OTP verified successfully. You can now reset your password',
                expiresIn: '50 minutes'
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};



export const resetPassword = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { newPassword, sessionToken } = validatedData;

        const forgotPasswordRecord = await ForgotPassword.findOne({ sessionToken });
        if (!forgotPasswordRecord) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invalid session. Please start the process again');
        }

        if (!forgotPasswordRecord.isVerified) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Please verify OTP first');
        }

        const seller = await Seller.findById(forgotPasswordRecord.sellerId);
        if (!seller) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Seller not found');
        }

        

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        seller.password = hashedPassword;
        await seller.save();

        await ForgotPassword.findByIdAndDelete(forgotPasswordRecord._id);

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: 'Password reset successfully. You can now login with your new password'
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const resendForgotPasswordOtp = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { sessionToken } = validatedData;

        const forgotPasswordRecord = await ForgotPassword.findOne({ sessionToken });
        if (!forgotPasswordRecord) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invalid session. Please start the forgot password process again');
        }

        if (forgotPasswordRecord.isVerified) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'OTP already verified. Please reset your password');
        }

        // Check if seller still exists
        const seller = await Seller.findById(forgotPasswordRecord.sellerId).lean();
        if (!seller) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Seller not found');
        }

        const otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        forgotPasswordRecord.otp = parseInt(otp);
        forgotPasswordRecord.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        forgotPasswordRecord.attempts = 0;
        await forgotPasswordRecord.save();

        if (forgotPasswordRecord.identifierType === 'email') {
            await sendMail(forgotPasswordRecord.identifier, 'forgot-password-otp.ejs', {
                otp,
                companyName: seller.companyName,
                subject: 'Reset Your Password - New OTP'
            });
        } else {
            const smsBody = getSignupBody(otp);
            console.log('Resend Forgot Password SMS OTP:', otp);
            // await sendSMS(forgotPasswordRecord.identifier, smsBody);
        }

        const maskedIdentifier = forgotPasswordRecord.identifierType === 'email' 
            ? forgotPasswordRecord.identifier.replace(/(.{2}).*(@.*)/, '$1***$2')
            : forgotPasswordRecord.identifier.replace(/(\d{2})\d+(\d{2})/, '$1****$2');

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                sessionToken,
                identifierType: forgotPasswordRecord.identifierType,
                identifier: maskedIdentifier,
                message: `New OTP sent to your ${forgotPasswordRecord.identifierType === 'email' ? 'email' : 'phone'}`,
                expiresIn: '10 minutes'
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};


