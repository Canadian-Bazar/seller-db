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





export const getProfile = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const seller = await Seller.findById(sellerId)
      .populate('categories')
      .select('-password -__v');

    if (!seller) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: 'Seller not found',
      });
    }

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, seller));
  } catch (error) {
    handleError(res, error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const sellerId = req.user._id;
    let validatedData = matchedData(req);

    const allowedFields = [
      'companyName',
      'parentCategory',
      'categories',
      'businessNumber',
      'street',
      'city',
      'state',
      'zip',
      'logo',
      'yearEstablished',
      'companyWebsite',
      'numberOfEmployees',
      'certifications',
      'socialMediaLinks',
    ];

    const updatedFields = Object.keys(req.body).filter(field => allowedFields.includes(field));
    const hasFileUpload = req?.files && req.files.length > 0;

    if (updatedFields.length === 0 && !hasFileUpload) {
      throw buildErrorObject(
        httpStatus.BAD_REQUEST,
        'No valid fields provided for update'
      );
    }

    if (!validatedData.hasOwnProperty('numberOfEmployees')) {
      validatedData.numberOfEmployees = null;
    }

    if (!validatedData.hasOwnProperty('socialMediaLinks')) {
      validatedData.socialMediaLinks = [];
    } else if (validatedData.socialMediaLinks === null || validatedData.socialMediaLinks === undefined) {
      validatedData.socialMediaLinks = [];
    }

    if (!validatedData.hasOwnProperty('certifications')) {
      validatedData.certifications = [];
    } else if (validatedData.certifications === null || validatedData.certifications === undefined) {
      validatedData.certifications = [];
    }

    let updatedSeller = await Seller.findByIdAndUpdate(
      sellerId,
      validatedData,
      { new: true }
    )
      .populate('categories', 'name')
      .select('-password -__v');

    if (!updatedSeller) {
      throw buildErrorObject(
        httpStatus.NOT_FOUND,
        'Seller not found'
      );
    }

    console.log('Updated Seller:', updatedSeller);

    const requiredFields = [
      'logo' ,
      'companyName',
      'categories',
      'businessNumber',
      'street',
      'city',
      'state',
      'zip',
      'parentCategory',
      'yearEstablished',
      'companyWebsite'
    ];

    const isProfileComplete = requiredFields.every(field => {
      const value = updatedSeller[field];
      
      console.log(`Checking field: ${field}, Value: ${value}`);
      
      if (Array.isArray(value)) {
        console.log(`Field ${field} is an array with length: ${value.length}`);
        return value.length > 0;
      }
      
      return value && value.toString().trim() !== '';
    });

    console.log('Is Profile Complete:', isProfileComplete);

    if (isProfileComplete) {
      await Seller.findByIdAndUpdate(
        sellerId,
        { isProfileComplete: true },
        { new: true }
      );
      
      updatedSeller.isProfileComplete = true;
    }

    console.log('Final Updated Seller:', updatedSeller);

    return res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, updatedSeller)
    );

  } catch (error) {
    handleError(res, error);
  }
};