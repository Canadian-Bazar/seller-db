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
  const session = await mongoose.startSession();
  let isTransactionCommitted = false;

  try {
    session.startTransaction();

    const validatedData = matchedData(req);
    const { documentation, websiteQuotationId, pricingPlans } = validatedData;

    const websiteQuotationExists = await WebsiteQuotation.findById(websiteQuotationId).session(session);
    if (!websiteQuotationExists) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid Website Quotation ID');
    }

    const sellerId = websiteQuotationExists.seller;


    const sellerExists = await Seller.findById(sellerId).session(session);
    if (!sellerExists){
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid Seller ID');
    }

    

    const activeSellerSubscription = await SellerSubscription.findOne({
      seller: sellerId,
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).populate('planVersionId').session(session);

    const hasActivePaidSubscription = activeSellerSubscription && 
      activeSellerSubscription.planVersionId && 
      (activeSellerSubscription.planVersionId.pricing.monthly > 0 || 
       activeSellerSubscription.planVersionId.pricing.quarterly > 0 || 
       activeSellerSubscription.planVersionId.pricing.yearly > 0);

    const processedPricingPlans = await Promise.all(pricingPlans?.map(async (plan) => {
      let subscriptionPrice = 0;
      
      if (plan.subscriptionPlanVersionId && !hasActivePaidSubscription) {
        const planVersion = await SubscriptionPlanVersion.findById(plan.subscriptionPlanVersionId).session(session);
        if (planVersion) {
          subscriptionPrice = planVersion.pricing.monthly || 0;
        }
      }

      return {
        planName: plan.planName,
        subscriptionPlanVersionId: plan.subscriptionPlanVersionId || null,
        subscriptionPrice: hasActivePaidSubscription ? 0 : subscriptionPrice,
        sitePrice: plan.sitePrice,
        totalPrice: plan.sitePrice + (hasActivePaidSubscription ? 0 : subscriptionPrice),
        status: 'pending',
        isActive: true
      };
    }) || []);

    const token = generateWebsiteDocumentationToken('temp');

    const websiteDocumentation = new WebsiteDocumentation({
      documentation,
      websiteQuotationId,
      pricingPlans: processedPricingPlans,
      token
    });

    await websiteDocumentation.save({ session });

    const finalToken = generateWebsiteDocumentationToken(websiteDocumentation._id);
    
    await WebsiteDocumentation.findByIdAndUpdate(
      websiteDocumentation._id,
      { token: finalToken },
      { session }
    );

    await session.commitTransaction();


    sendMail(sellerExists.email, 'documentation.ejs', {
      token:finalToken,
      subject: 'Documentation',
      frontendURL: process.env.FRONTEND_URL,
    })
    isTransactionCommitted = true;

    return res.status(httpStatus.CREATED).json(buildResponse(httpStatus.CREATED,
      'Website documentation created successfully', { 
        token: finalToken,
        documentationId: websiteDocumentation._id 
      }
    ));

  } catch (err) {
    if (!isTransactionCommitted) {
      await session.abortTransaction();
    }
    handleError(res, err);
  } finally {
    session.endSession();
  }
};
export const getWebsiteDocumentationController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { token } = validatedData;

    try {
      const decoded = jwt.verify(token, process.env.DOCUMENTATION_SECRET);
      const { documentationId } = decoded;

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
        console.log(tokenError)
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Token verification failed');
      }
    }

  } catch (err) {
    handleError(res, err);
  }
};

