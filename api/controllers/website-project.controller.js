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
import WebsiteProjectChat from '../models/website-project-chat.schema.js'



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
     .select('selectedPlan projectStatus paymentStatus projectStartDate expectedCompletionDate actualCompletionDate percentageCompletion report additionalDetails report2 anyChanges additionalSuggestions websiteOverviewLink notes amountPaid amountPending completionPaymentToken hasPaymentLink linkExpiry finalPaymentCompleted createdAt updatedAt')
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
   .populate('transactionId')
   .select('projectStatus paymentStatus projectStartDate expectedCompletionDate actualCompletionDate percentageCompletion report additionalDetails report2 anyChanges additionalSuggestions websiteOverviewLink notes amountPaid amountPending completionPaymentToken hasPaymentLink linkExpiry finalPaymentCompleted createdAt updatedAt selectedPlan');

   if (!websiteProject) {
     throw buildErrorObject(httpStatus.NOT_FOUND, 'Website project not found');
   }

   // Fetch chat information directly from database
   let chatId = null;
   try {
     const chat = await WebsiteProjectChat.findOne({
       seller: req.user._id,
       websiteProjectId: id
     });
     


     console.log("chat" , chat)
     if (chat) {
       chatId = chat._id;
     }
   } catch (chatError) {
     console.log('Could not fetch chat info:', chatError.message);
     // Continue without chat info
   }

   const projectWithChat = {
     ...websiteProject.toObject(),
     chatId
   };

   return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
    projectWithChat
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

// Update seller inputs (anyChanges and additionalSuggestions)
export const updateWebsiteProjectSellerInputsController = async (req, res) => {
 try {
   const validatedData = matchedData(req);
   const { id } = validatedData;
   const { anyChanges, additionalSuggestions } = validatedData;

   const websiteProject = await WebsiteProject.findOne({ 
     _id: id, 
     seller: req.user._id 
   });

   if (!websiteProject) {
     throw buildErrorObject(httpStatus.NOT_FOUND, 'Website project not found');
   }

   if (websiteProject.projectStatus !== 'in_progress') {
     throw buildErrorObject(httpStatus.BAD_REQUEST, 'Can only add inputs to in_progress projects');
   }

   const updateData = {};
   if (anyChanges !== undefined) updateData.anyChanges = anyChanges;
   if (additionalSuggestions !== undefined) updateData.additionalSuggestions = additionalSuggestions;

   const updatedProject = await WebsiteProject.findByIdAndUpdate(
     id,
     updateData,
     { new: true, runValidators: true }
   );

   return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
     'Inputs updated successfully', updatedProject
   ));

 } catch (err) {
   handleError(res, err);
 }
};




export const getCurrentProjectStatusController = async (req, res) => {
  try {
    const sellerId = req.user._id; 

    let currentProject = await WebsiteProject.findOne({ seller: sellerId  })
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
      .select('projectStatus paymentStatus projectStartDate expectedCompletionDate actualCompletionDate percentageCompletion report additionalDetails report2 anyChanges additionalSuggestions websiteOverviewLink notes amountPaid amountPending completionPaymentToken hasPaymentLink linkExpiry finalPaymentCompleted createdAt updatedAt selectedPlan')
      .sort({ createdAt: -1 }) 
      .lean();

    if (currentProject) {
      // Fetch chat information

      console.log('currentpron' , currentProject)
      let chatId = null;
      try {
        const chat = await WebsiteProjectChat.findOne({
          websiteProjectId: currentProject._id
        });


        console.log("chat" ,chat)
        
        if (chat) {
          chatId = chat._id;
        }
      } catch (chatError) {
        console.log('Could not fetch chat info:', chatError.message);
      }

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
        .json(buildResponse(httpStatus.OK, { ...currentProject, statusMessage, chatId }));
    }

    const quotationExists = await WebsiteQuotation.findOne({ seller: sellerId  , status:'pending'});
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

// ADMIN CONTROLLERS

export const getAllWebsiteProjectsForAdminController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { page = 1, limit = 10, projectStatus, paymentStatus } = validatedData;

    const filter = {};
    if (projectStatus) {
      filter.projectStatus = projectStatus;
    }
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
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
        path: 'seller',
        select: 'name email'
      })
      .populate({
        path: 'websiteQuotation',
        select: 'domainName referenceurl referenceWebTemplates itemsSold',
        populate: {
          path: 'referenceWebTemplates',
          select: 'name url'
        }
      })
      .select('selectedPlan projectStatus paymentStatus projectStartDate expectedCompletionDate percentageCompletion createdAt')
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

export const getWebsiteProjectByIdForAdminController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { id } = validatedData;

    const websiteProject = await WebsiteProject.findById(id)
      .populate({
        path: 'seller',
        select: 'name email'
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

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, websiteProject));

  } catch (err) {
    handleError(res, err);
  }
};

export const updateWebsiteProjectStatusController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { id } = validatedData;
    const { projectStatus, notes, percentageCompletion, expectedCompletionDate, actualCompletionDate } = validatedData;

    const websiteProject = await WebsiteProject.findById(id);

    if (!websiteProject) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Website project not found');
    }

    const updateData = {};
    if (projectStatus) updateData.projectStatus = projectStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (percentageCompletion !== undefined) updateData.percentageCompletion = percentageCompletion;
    if (expectedCompletionDate) updateData.expectedCompletionDate = expectedCompletionDate;
    if (actualCompletionDate) updateData.actualCompletionDate = actualCompletionDate;

    // If project is marked as completed, set actual completion date
    if (projectStatus === 'completed' && !actualCompletionDate) {
      updateData.actualCompletionDate = new Date();
      updateData.percentageCompletion = 100;
    }

    // If project is in progress and no start date exists, set it
    if (projectStatus === 'in_progress' && !websiteProject.projectStartDate) {
      updateData.projectStartDate = new Date();
    }

    const updatedProject = await WebsiteProject.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'seller',
      select: 'name email'
    })
    .populate({
      path: 'websiteQuotation',
      select: 'domainName referenceurl referenceWebTemplates itemsSold',
      populate: {
        path: 'referenceWebTemplates',
        select: 'name url'
      }
    });

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
      'Website project updated successfully', updatedProject
    ));

  } catch (err) {
    handleError(res, err);
  }
};

// Admin controller to update all project fields including reports
export const updateWebsiteProjectProgressController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { id } = validatedData;
    const { 
      percentage, 
      report, 
      additionalDetails, 
      report2, 
      websiteOverviewLink,
      projectStatus,
      notes
    } = validatedData;

    const websiteProject = await WebsiteProject.findById(id);

    if (!websiteProject) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Website project not found');
    }

    const updateData = {};
    
    // Update admin-only fields
    if (percentage !== undefined) updateData.percentageCompletion = percentage;
    if (report !== undefined) updateData.report = report;
    if (additionalDetails !== undefined) updateData.additionalDetails = additionalDetails;
    if (report2 !== undefined) updateData.report2 = report2;
    if (websiteOverviewLink !== undefined) updateData.websiteOverviewLink = websiteOverviewLink;
    if (projectStatus !== undefined) updateData.projectStatus = projectStatus;
    if (notes !== undefined) updateData.notes = notes;
    
    // Auto-complete logic
    if (percentage === 100 && websiteProject.projectStatus !== 'completed') {
      updateData.projectStatus = 'completed';
      updateData.actualCompletionDate = new Date();
    }

    // If project is marked as completed, set actual completion date and 100%
    if (projectStatus === 'completed' && !websiteProject.actualCompletionDate) {
      updateData.actualCompletionDate = new Date();
      if (updateData.percentageCompletion === undefined) {
        updateData.percentageCompletion = 100;
      }
    }

    // If project is in progress and no start date exists, set it
    if (projectStatus === 'in_progress' && !websiteProject.projectStartDate) {
      updateData.projectStartDate = new Date();
    }

    const updatedProject = await WebsiteProject.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'seller',
      select: 'name email'
    })
    .populate({
      path: 'websiteQuotation',
      select: 'domainName referenceurl referenceWebTemplates itemsSold',
      populate: {
        path: 'referenceWebTemplates',
        select: 'name url'
      }
    });

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
      'Website project updated successfully', updatedProject
    ));

  } catch (err) {
    handleError(res, err);
  }
};




/**
 * Get completion payment details by token
 */
export const getCompletionPaymentDetailsByTokenController = async (req, res) => {
  try {
    const { token } = req.params
    
    const project = await WebsiteProject.findOne({ 
      completionPaymentToken: token,
      completionPaymentTokenExpiry: { $gt: new Date() },
      finalPaymentCompleted: false
    })
    .populate({
      path: "websiteQuotation",
      select: "domainName itemsSold additionalDetails"
    })
    .populate("websiteDocumentation")
    .populate("selectedPlan.subscriptionPlanVersionId")
    .select("projectStatus percentageCompletion websiteOverviewLink selectedPlan amountPaid amountPending completionPaymentTokenExpiry createdAt updatedAt")

    if (!project) {
      throw buildErrorObject(httpStatus.NOT_FOUND, "Invalid or expired completion payment token")
    }

    // Calculate remaining payment amount (50% of total)
    const totalAmount = project.selectedPlan?.totalPrice || 0
    const remainingAmount = Math.round((totalAmount - (project.amountPaid || 0)) * 100) / 100

    const response = {
      project: {
        _id: project._id,
        domainName: project.websiteQuotation?.domainName,
        websiteOverviewLink: project.websiteOverviewLink,
        selectedPlan: project.selectedPlan,
        percentageCompletion: project.percentageCompletion,
        totalAmount,
        amountPaid: project.amountPaid || 0,
        remainingAmount,
        tokenExpiry: project.completionPaymentTokenExpiry,
        completedAt: project.updatedAt
      },
      token
    }

    res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response))
  } catch (err) {
    handleError(res, err)
  }
}

// Update seller project (only additionalDetails and notes)
export const updateWebsiteProjectSellerController = async (req, res) => {
 try {
   const validatedData = matchedData(req);
   const { id } = validatedData;
   const { additionalDetails, notes } = validatedData;

   const websiteProject = await WebsiteProject.findOne({ 
     _id: id, 
     seller: req.user._id 
   });

   if (!websiteProject) {
     throw buildErrorObject(httpStatus.NOT_FOUND, 'Website project not found');
   }

   const updateData = {};
   if (additionalDetails !== undefined) updateData.additionalDetails = additionalDetails;
   if (notes !== undefined) updateData.notes = notes;

   const updatedProject = await WebsiteProject.findByIdAndUpdate(
     id,
     updateData,
     { new: true, runValidators: true }
   )
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
   .populate('transactionId')
   .select('projectStatus paymentStatus projectStartDate expectedCompletionDate actualCompletionDate percentageCompletion report additionalDetails report2 anyChanges additionalSuggestions websiteOverviewLink notes amountPaid amountPending completionPaymentToken hasPaymentLink linkExpiry finalPaymentCompleted createdAt updatedAt selectedPlan');

   return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
     'Project updated successfully', updatedProject
   ));

 } catch (err) {
   handleError(res, err);
 }
};
