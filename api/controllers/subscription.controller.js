import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import { matchedData } from 'express-validator';
import buildResponse from '../utils/buildResponse.js';
import SellerSubscription from '../models/seller-subscription.schema.js';
import SubscriptionPlanVersion from '../models/subscription-plan-version.schema.js';
import SubscriptionPlanTemplate from '../models/subsciption-plan-template.schema.js';
import mongoose from 'mongoose';
import  httpStatus  from 'http-status';









/**
 * @description Fetch subsciption plans (currently no pagination and filters)
 * @returns {Promise<Array>} - Array of subscription plans
 */






export const getSubscriptionPlans = async (req, res) => {
  try {
    let userId = new mongoose.Types.ObjectId(req.user._id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const matchStage = {
      isActive: true
    };

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get user's current subscription details separately
    const userSubscription = await SellerSubscription.findOne({
      seller: userId,
      endDate: { $gt: new Date() }
    }).populate([
      {
        path: 'planVersionId',
        populate: {
          path: 'templateId',
          select: 'name description'
        }
      }
    ]);

    const pipeline = [
      {
        $match: matchStage
      },
      {
        $lookup: {
          from: 'SubscriptionPlanVersion',
          let: {
            templateId: '$_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$templateId', '$$templateId'] },
                    { $eq: ['$isCurrent', true] },
                    { $eq: ['$isDeprecated', false] }
                  ]
                }
              }
            }
          ],
          as: 'currentVersion'
        }
      },
      {
        $unwind: {
          path: '$currentVersion',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: '$_id',
          name: '$name',
          description: '$description',
          versionId: '$currentVersion._id',
          versionNumber: '$currentVersion.versionNumber',
          pricing: '$currentVersion.pricing',
          features: '$currentVersion.features',
          featuresArray: '$currentVersion.featuresArray'
        }
      },
      {
        $sort: {
          'pricing.monthly': 1
        }
      }
    ];

    const countPipeline = [
      {
        $match: matchStage
      },
      {
        $count: "total"
      }
    ];

    const [docs, countResult] = await Promise.all([
      SubscriptionPlanTemplate.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit }
      ]),
      SubscriptionPlanTemplate.aggregate(countPipeline)
    ]);

    const totalDocs = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalDocs / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Prepare user plan details
    let userPlanDetails = null;
    if (userSubscription) {
      userPlanDetails = {
        subscriptionId: userSubscription._id,
        planId: userSubscription.planVersionId.templateId._id,
        planName: userSubscription.planVersionId.templateId.name,
        planDescription: userSubscription.planVersionId.templateId.description,
        versionId: userSubscription.planVersionId._id,
        startDate: userSubscription.startDate,
        endDate: userSubscription.endDate,
        status: userSubscription.status,
        billingCycle: userSubscription.billingCycle,
        autoRenew: userSubscription.autoRenew,
        paymentStatus: userSubscription.paymentStatus,
        cancellationDate: userSubscription.cancellationDate,
        stripeSubscriptionId: userSubscription.stripeSubscriptionId,
        pricing: userSubscription.planVersionId.pricing,
        features: userSubscription.planVersionId.features,
        featuresArray: userSubscription.planVersionId.featuresArray,
        daysRemaining: Math.ceil((new Date(userSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      };
    }

    const response = {
      plans: {
        docs,
        totalDocs,
        limit,
        page,
        totalPages,
        hasNext,
        hasPrev
      },
      userPlanDetails: userPlanDetails,
      hasActiveSubscription: !!userSubscription
    };

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));

  } catch (error) {
    handleError(res, error);
  }
};