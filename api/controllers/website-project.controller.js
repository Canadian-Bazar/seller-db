import { check, param } from "express-validator";
import validateRequest from "../utils/validateRequest.js";

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
import WebsiteProject from '../models/website-project.schema.js'



export const getAllWebsiteProjectsController = async (req, res) => {
 try {
   const validatedData = matchedData(req);
   const { page = 1, limit = 10, projectStatus } = validatedData;

   const filter = { seller: req.user._id };
   if (projectStatus) {
     filter.projectStatus = projectStatus;
   }

   const pageNumber = parseInt(page);
   const limitNumber = parseInt(limit);
   const skip = (pageNumber - 1) * limitNumber;

   const totalDocs = await WebsiteProject.countDocuments(filter);
   const totalPages = Math.ceil(totalDocs / limitNumber);
   const hasNextPage = pageNumber < totalPages;
   const hasPrevPage = pageNumber > 1;

   const docs = await WebsiteProject.find(filter)
     .populate({
       path: 'websiteQuotation',
       select: 'domainName referenceurl referenceWebTemplates itemsSold',
       populate: {
         path: 'referenceWebTemplates',
         select: 'name url'
       }
     })
     .select('selectedPlan projectStatus paymentStatus projectStartDate createdAt')
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(limitNumber);

   const response = {
     docs,
     totalDocs,
     totalPages,
     page: pageNumber,
     limit: limitNumber,
     hasNextPage,
     hasPrevPage
   };

   return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));

 } catch (err) {
   handleError(res, err);
 }
};

export const getWebsiteProjectByIdController = async (req, res) => {
 try {
    const validatedData = matchedData(req);
const {id} = validatedData
   const websiteProject = await WebsiteProject.findOne({ 
     _id: id, 
     seller: req.user._id 
   })
   .populate({
     path: 'websiteQuotation',
     select: 'domainName referenceurl referenceWebTemplates itemsSold additionalDetails',
     populate: {
       path: 'referenceWebTemplates',
       select: 'name url'
     }
   })
   .populate('websiteDocumentation')
   .populate('selectedPlan.subscriptionPlanVersionId')
   .populate('transactionId');

   if (!websiteProject) {
     throw buildErrorObject(httpStatus.NOT_FOUND, 'Website project not found');
   }

   return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
    websiteProject
   ));

 } catch (err) {
   handleError(res, err);
 }
};

// Update report only
export const updateWebsiteProjectReportController = async (req, res) => {
 try {
   const validatedData = matchedData(req);
      const { id } = validatedData;

   const { report , percentageCompletion } = validatedData;

   const websiteProject = await WebsiteProject.findOne({ 
     _id: id, 
     seller: req.user._id 
   });

   if (!websiteProject) {
     throw buildErrorObject(httpStatus.NOT_FOUND, 'Website project not found');
   }

   const updatedProject = await WebsiteProject.findByIdAndUpdate(
     id,
     { report , percentageCompletion },
     { new: true, runValidators: true }
   );

   return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
     'Report updated successfully', updatedProject
   ));

 } catch (err) {
   handleError(res, err);
 }
};




export const getCurrentProjectStatusController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const sellerId = req.user._id; 

    let currentProject = await WebsiteProject.findOne({ seller: sellerId })
      .populate({
        path: "websiteQuotation",
        select:
          "domainName referenceurl referenceWebTemplates itemsSold additionalDetails",
        populate: {
          path: "referenceWebTemplates",
          select: "name url",
        },
      })
      .populate("websiteDocumentation")
      .populate("selectedPlan.subscriptionPlanVersionId")
      .populate("transactionId")
      .sort({ createdAt: -1 }) 
      .lean();

    if (currentProject) {
      let statusMessage = "";
      switch (currentProject.projectStatus) {
        case "initiated":
          statusMessage = "Project has been initiated. Waiting for documentation.";
          break;
        case "documentation_created":
          statusMessage = "Documentation has been created. Please select a plan.";
          break;
        case "plan_selected":
          statusMessage = "Plan has been selected. Please complete payment.";
          break;
        case "payment_completed":
          statusMessage = "Payment completed. Project will start soon.";
          break;
        case "in_progress":
          statusMessage = `Project is in progress. ${
            currentProject.percentageCompletion || 0
          }% completed.`;
          break;
        case "completed":
          statusMessage = "Project has been completed successfully.";
          break;
        case "cancelled":
          statusMessage = "Project has been cancelled.";
          break;
        default:
          statusMessage = "Project status unknown.";
      }

      return res
        .status(httpStatus.OK)
        .json(buildResponse(httpStatus.OK, { ...currentProject, statusMessage }));
    }

    const quotationExists = await WebsiteQuotation.findOne({ seller: sellerId });
    if (quotationExists) {
      return res
        .status(httpStatus.OK)
        .json(buildResponse(httpStatus.OK,  "Your request has been submitted" ));
    }

    throw buildErrorObject(httpStatus.NOT_FOUND, "No project found for this seller");
  } catch (err) {
    handleError(res, err);
  }
};


