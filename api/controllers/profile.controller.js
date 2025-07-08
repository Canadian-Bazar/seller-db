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
    const sellerId = req.user._id
    const seller = await Seller.findById(sellerId)
      .select('-password -__v')

    if (!seller) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: 'Seller not found',
      })
    }

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, seller))
  } catch (error) {
    handleError(res, error)
  }
}


export const updateProfile = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const validatedData = matchedData(req);

    if (req?.files && req.files.length > 0) {
      const imageUrls = await uploadFile(req.files);
      validatedData.logo = imageUrls[0];
    }

    const allowedFields = [
      'companyName',
      'businessType',
      'categories',
      'businessNumber',
      'street',
      'city',
      'state',
      'zip',
      'logo'
    ];

    // Check if any valid fields are provided for update
    const updatedFields = Object.keys(req.body).filter(field => allowedFields.includes(field));
    const hasFileUpload = req?.files && req.files.length > 0;
    
    if (updatedFields.length === 0 && !hasFileUpload) {
      throw buildErrorObject(
        httpStatus.BAD_REQUEST,
        'No valid fields provided for update'
      );
    }

    let updatedSeller = await Seller.findByIdAndUpdate(
      sellerId,
      validatedData,
      { new: true }
    )
      .populate('businessType', 'name')
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
      'companyName',
      'businessType',
      'categories',
      'businessNumber',
      'street',
      'city',
      'state',
      'zip'
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

    console.log(isProfileComplete)

    if (isProfileComplete ) {
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





