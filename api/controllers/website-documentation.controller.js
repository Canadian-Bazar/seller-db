import handleError from "../utils/handleError.js";
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import httpStatus from "http-status"; 
import WebsiteDocumentation from '../models/website-documentation.schema.js'
import WebsiteQuotation from '../models/website-quotation.schema.js'
import { matchedData } from "express-validator";
import jwt, { decode } from 'jsonwebtoken'
import SellerSubscription from '../models/seller-subscription.schema.js'
import mongoose from "mongoose";
import Seller from '../models/seller.schema.js'
import sendMail from '../helpers/sendMail.js'











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

export const rejectWebsiteDocumentationController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { token, rejectionReason, feedback } = validatedData;

    try {
      const decoded = jwt.verify(token, process.env.DOCUMENTATION_SECRET);
      const { documentationId } = decoded;

      const websiteDocumentation = await WebsiteDocumentation.findById(documentationId)
        .populate({
          path: 'websiteQuotationId',
          populate: {
            path: 'seller',
            select: 'companyName email'
          }
        });

      if (!websiteDocumentation) {
        throw buildErrorObject(httpStatus.NOT_FOUND, 'Website documentation not found');
      }

      if (websiteDocumentation.status !== 'pending') {
        throw buildErrorObject(httpStatus.BAD_REQUEST, 'Documentation has already been processed');
      }

      // Update documentation status to rejected
      websiteDocumentation.status = 'rejected';
      websiteDocumentation.rejectionReason = rejectionReason;
      websiteDocumentation.feedback = feedback;
      websiteDocumentation.rejectedAt = new Date();

      await websiteDocumentation.save();

      // 📧 Send email notification to admin about documentation rejection
      try {
        const seller = websiteDocumentation.websiteQuotationId?.seller;
        const adminEmail = process.env.ADMIN_EMAIL || 'pulkit@canadian-bazaar.com';
        const adminDashboardUrl = `${process.env.ADMIN_FRONTEND_URL || 'https://admin.canadian-bazaar.com'}/website-quotations`;
        const rejectionDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        await sendMail(adminEmail, 'website-documentation-rejected.ejs', {
          companyName: seller?.companyName || 'Unknown',
          email: seller?.email || 'Not provided',
          domainName: websiteDocumentation.websiteQuotationId?.domainName || 'Unknown',
          rejectionReason: rejectionReason,
          feedback: feedback || null,
          rejectionDate: rejectionDate,
          adminDashboardUrl: adminDashboardUrl,
          subject: `Website Documentation Rejected: ${seller?.companyName || 'Seller'}`
        });
      } catch (emailError) {
        console.error('Failed to send documentation rejection notification to admin:', emailError);
      }

      return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, 
        'Documentation rejected successfully. Admin has been notified to provide updated documentation.', 
        {
          status: 'rejected',
          rejectionReason,
          feedback
        }
      ));

    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Documentation access token has expired');
      } else if (tokenError.name === 'JsonWebTokenError') {
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Invalid documentation access token');
      } else {
        throw buildErrorObject(httpStatus.UNAUTHORIZED, 'Token verification failed');
      }
    }

  } catch (err) {
    handleError(res, err);
  }
};
export const getWebsiteDocumentationController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { token } = validatedData;

    try {
      const decoded = jwt.verify(token, process.env.DOCUMENTATION_SECRET);

      console.log("decoded" , decoded)
      const { websiteDocumentationId:documentationId } = decoded;


      console.log("id total" ,documentationId)

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

      // Ensure numeric pricing and correct total in the response
      const docObject = websiteDocumentation.toObject();
      if (Array.isArray(docObject.pricingPlans)) {
        docObject.pricingPlans = docObject.pricingPlans.map((plan) => {
          const site = Number(plan.sitePrice || 0);
          const sub = Number(plan.subscriptionPrice || 0);
          return {
            ...plan,
            sitePrice: site,
            subscriptionPrice: sub,
            totalPrice: site + sub
          };
        });
      }

      return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
        docObject
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

