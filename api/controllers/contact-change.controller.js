import Seller from '../models/seller.schema.js'
import handleError from '../utils/handleError.js'
import httpStatus from 'http-status'
import { check, matchedData, param } from 'express-validator'
import validateRequest from '../utils/validateRequest.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import buildResponse from '../utils/buildResponse.js'
import { uploadFile } from '../helpers/aws-s3.js'
import { v4 as uuidv4 } from 'uuid'
import SellerContactChange from '../models/seller-contact-change.schema.js'
import sendMail from '../helpers/sendMail.js'
import { sendTextMessage } from '../helpers/sendTextMessage.js'
import otpGenerator from 'otp-generator'
import { getSignupBody } from '../helpers/getSignupBody.js'


export const initiateContactChangeController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { changeType, newEmail, newPhone } = validatedData;
        const sellerId = req.user._id;

        const seller = await Seller.findById(sellerId).select('email phone companyName').lean();
        if (!seller) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Seller not found');
        }

        if (changeType === 'email' && seller.email === newEmail) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'New email cannot be the same as current email');
        }
        
        if (changeType === 'phone' && seller.phone === newPhone) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'New phone number cannot be the same as current phone number');
        }

        if (changeType === 'email') {
            const existingSellerWithEmail = await Seller.findOne({ 
                email: newEmail, 
                _id: { $ne: sellerId } 
            }).lean();
            if (existingSellerWithEmail) {
                throw buildErrorObject(httpStatus.CONFLICT, 'Email already registered with another seller');
            }
        }

        if (changeType === 'phone') {
            const existingSellerWithPhone = await Seller.findOne({ 
                phone: newPhone, 
                _id: { $ne: sellerId } 
            }).lean();
            if (existingSellerWithPhone) {
                throw buildErrorObject(httpStatus.CONFLICT, 'Phone number already registered with another seller');
            }
        }

        await SellerContactChange.deleteMany({
            sellerId,
            changeType,
            isCompleted: false
        });

        const sessionToken = uuidv4();
        const currentContactOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        const changeRequest = new SellerContactChange({
            sellerId,
            changeType,
            currentEmail: seller.email,
            currentPhone: seller.phone,
            newEmail: changeType === 'email' ? newEmail : undefined,
            newPhone: changeType === 'phone' ? newPhone : undefined,
            sessionToken,
            currentContactOtp: parseInt(currentContactOtp),
            currentContactOtpExpiry: new Date(Date.now() + 10 * 60 * 1000), 
            requestIp: req.ip,
            requestUserAgent: req.get('User-Agent')
        });

        await changeRequest.save();

        if (changeType === 'email') {
            await sendMail(seller.email, 'contact-change-verify-current.ejs', {
                otp: currentContactOtp,
                companyName: seller.companyName,
                changeType: 'email address',
                newContact: newEmail,
                subject: 'Verify Current Email - Contact Change Request'
            });
        } else {
            const body = getSignupBody(currentContactOtp);
            console.log(body)
            // await sendTextMessage(seller.phone, body);
        }

        const maskedContact = changeType === 'email' 
            ? seller.email.replace(/(.{2}).*(@.*)/, '$1***$2')
            : seller.phone.replace(/(\d{2})\d+(\d{2})/, '$1****$2');

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                sessionToken,
                step: 'verify_current',
                changeType,
                currentContact: maskedContact,
                message: `OTP sent to your current ${changeType} for verification`
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};


export const verifyCurrentContactOtpController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { sessionToken, otp } = validatedData;

        const changeRequest = await SellerContactChange.findOne({ sessionToken });
        if (!changeRequest) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invalid session. Please start the process again.');
        }

        if (changeRequest.step !== 'verify_current') {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid step in the change process');
        }

        if (changeRequest.currentContactOtpExpiry < new Date()) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'OTP expired. Please request a new one.');
        }

        if (changeRequest.currentContactOtpAttempts >= 5) {
            await SellerContactChange.deleteOne({ _id: changeRequest._id });
            throw buildErrorObject(httpStatus.TOO_MANY_REQUESTS, 'Too many invalid attempts. Please start again.');
        }

        if (parseInt(changeRequest.currentContactOtp) !== parseInt(otp)) {
            changeRequest.currentContactOtpAttempts += 1;
            await changeRequest.save();
            throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Invalid OTP');
        }

        const newContactOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        changeRequest.isCurrentContactVerified = true;
        changeRequest.step = 'verify_new';
        changeRequest.newContactOtp = parseInt(newContactOtp);
        changeRequest.newContactOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        changeRequest.newContactOtpAttempts = 0;
        await changeRequest.save();

        const seller = await Seller.findById(changeRequest.sellerId).select('companyName').lean();

        if (changeRequest.changeType === 'email') {
            await sendMail(changeRequest.newEmail, 'contact-change-verify-new.ejs', {
                otp: newContactOtp,
                companyName: seller.companyName,
                changeType: 'email address',
                subject: 'Verify New Email - Contact Change Request'
            });
        } else {
            const body = getSignupBody(newContactOtp);
            console.log(body)
            // await sendTextMessage(changeRequest.newPhone, body);
        }

        const maskedNewContact = changeRequest.changeType === 'email'
            ? changeRequest.newEmail.replace(/(.{2}).*(@.*)/, '$1***$2')
            : changeRequest.newPhone.replace(/(\d{2})\d+(\d{2})/, '$1****$2');

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                sessionToken,
                step: 'verify_new',
                changeType: changeRequest.changeType,
                newContact: maskedNewContact,
                message: `OTP sent to your new ${changeRequest.changeType} for verification`
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};


export const verifyNewContactOtpController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { sessionToken, otp } = validatedData;

        const changeRequest = await SellerContactChange.findOne({ sessionToken });
        if (!changeRequest) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invalid session. Please start the process again.');
        }

        if (changeRequest.step !== 'verify_new') {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid step in the change process');
        }

        if (!changeRequest.isCurrentContactVerified) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Current contact verification incomplete');
        }

        if (changeRequest.newContactOtpExpiry < new Date()) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'OTP expired. Please request a new one.');
        }

        if (changeRequest.newContactOtpAttempts >= 5) {
            await SellerContactChange.deleteOne({ _id: changeRequest._id });
            throw buildErrorObject(httpStatus.TOO_MANY_REQUESTS, 'Too many invalid attempts. Please start again.');
        }

        if (parseInt(changeRequest.newContactOtp) !== parseInt(otp)) {
            changeRequest.newContactOtpAttempts += 1;
            await changeRequest.save();
            throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Invalid OTP');
        }

        const updateData = {};
        if (changeRequest.changeType === 'email') {
            updateData.email = changeRequest.newEmail;
        } else {
            updateData.phone = changeRequest.newPhone;
        }

        await Seller.findByIdAndUpdate(changeRequest.sellerId, updateData);

        changeRequest.isNewContactVerified = true;
        changeRequest.isCompleted = true;
        changeRequest.step = 'completed';
        await changeRequest.save();

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: `${changeRequest.changeType === 'email' ? 'Email' : 'Phone number'} changed successfully`,
                changeType: changeRequest.changeType,
                newContact: changeRequest.changeType === 'email' ? changeRequest.newEmail : changeRequest.newPhone
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};


 
export const resendContactChangeOtpController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { sessionToken, otpType } = validatedData;

        const changeRequest = await SellerContactChange.findOne({ sessionToken });
        if (!changeRequest) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Invalid session. Please start the process again.');
        }

        let newOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        const seller = await Seller.findById(changeRequest.sellerId).select('companyName').lean();

        if (otpType === 'current') {
            if (changeRequest.step !== 'verify_current') {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Cannot resend current contact OTP at this step');
            }

            changeRequest.currentContactOtp = parseInt(newOtp);
            changeRequest.currentContactOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            changeRequest.currentContactOtpAttempts = 0;

            if (changeRequest.changeType === 'email') {
                await sendMail(changeRequest.currentEmail, 'contact-change-verify-current.ejs', {
                    otp: newOtp,
                    companyName: seller.companyName,
                    changeType: 'email address',
                    newContact: changeRequest.newEmail,
                    subject: 'Resend: Verify Current Email - Contact Change Request'
                });
            } else {
                const body = getSignupBody(newOtp);
                console.log(body)
                // await sendTextMessage(changeRequest.currentPhone, body);
            }

        } else {
            if (changeRequest.step !== 'verify_new') {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Cannot resend new contact OTP at this step');
            }

            changeRequest.newContactOtp = parseInt(newOtp);
            changeRequest.newContactOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            changeRequest.newContactOtpAttempts = 0;

            if (changeRequest.changeType === 'email') {
                await sendMail(changeRequest.newEmail, 'contact-change-verify-new.ejs', {
                    otp: newOtp,
                    companyName: seller.companyName,
                    changeType: 'email address',
                    subject: 'Resend: Verify New Email - Contact Change Request'
                });
            } else {
                const body = getSignupBody(newOtp);
                console.log(body)
                // await sendTextMessage(changeRequest.newPhone, body);
            }
        }

        await changeRequest.save();

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: `OTP resent to ${otpType} ${changeRequest.changeType}`,
                sessionToken
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};
