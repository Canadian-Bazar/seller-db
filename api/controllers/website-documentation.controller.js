import handleError from "../utils/handleError.js";
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import httpStatus from "http-status"; 
import WebsiteDocumentation from '../models/website-documentation.schema.js'
import WebsiteQuotation from '../models/website-quotation.schema.js'
import { matchedData } from "express-validator";
import jwt from 'jsonwebtoken'
import SellerSubscription from '../models/seller-subscription.schema.js'
import mongoose from "mongoose";
import Seller from '../models/seller.schema.js'











export const generateWebsiteDocumentationToken = (id) => {
  return jwt.sign({ documentationId: id },
    process.env.DOCUMENTATION_SECRET,
    {
      expiresIn: '30d'
    }
  )
}

export const createWebsiteDocumentationController = async (req, res) => {

};
export const getWebsiteDocumentationController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { token } = validatedData;

    try {
      const decoded = jwt.verify(token, process.env.DOCUMENTATION_SECRET);
      const { documentationId } = decoded;


      console.log("id" ,documentationId)

      const websiteDocumentation = await WebsiteDocumentation.findById(documentationId)
        .populate({
          path: 'websiteQuotationId',
          populate: {
            path: 'seller category',
            select: 'name email categoryName'
          }
        })
        .populate('pricingPlans.subscriptionPlanVersionId');

      if (!websiteDocumentation) {
        throw buildErrorObject(httpStatus.NOT_FOUND, 'Website documentation not found');
      }

      return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
        websiteDocumentation
      ));

    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Documentation access token has expired');
      } else if (tokenError.name === 'JsonWebTokenError') {
        console.log()
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Invalid documentation access token');
      } else if (tokenError.name === 'NotBeforeError') {
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Documentation access token not active yet');
      } else {
        console.log("pink" ,tokenError)
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Token verification failed');
      }
    }

  } catch (err) {
    handleError(res, err);
  }
};

