import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import { matchedData } from 'express-validator';
import buildResponse from '../utils/buildResponse.js';
import SellerSubscription from '../models/seller-subscription.schema.js';
import SubscriptionPlanVersion from '../models/subscription-plan-version.schema.js';
import mongoose from 'mongoose';









/**
 * @description Fetch subsciption plans (currently no pagination and filters)
 * @returns {Promise<Array>} - Array of subscription plans
 */




export const getSubscriptionPlans = async (req, res) => {
  try {

    let userId = new mongoose.Types.ObjectId(req.user._id);

    





 
   
const pipeline = [
    {
        $match: {
            isActive: true
        }
    },
    {
        $lookup: {
            from: 'SubscriptionPlanVersion', // ✅ Collection name is correct
            let: {
                templateId: '$_id'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [ // ❌ YOU WERE MISSING $and - FIXED
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
        $lookup: {
            from: 'SellerSubscription', 
            let: {
                planVersionId: '$currentVersion._id',
                sellerId: userId 
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ['$seller', '$$sellerId'] },
                                { $eq: ['$planVersionId', '$$planVersionId'] },
                                { $eq: ['$isDeleted', false] }
                            ]
                        }
                    }
                }
            ],
            as: 'userSubscription'
        }
    },
    {
        $project: {
            _id: '$_id',
            name: '$name',
            versionId: '$currentVersion._id',
            versionNumber: '$currentVersion.versionNumber',
            pricing: '$currentVersion.pricing',
            features: '$currentVersion.features',
            availedByUser: {
                $cond: {
                    if: { $gt: [{ $size: '$userSubscription' }, 0] },
                    then: true,
                    else: false
                }
            },
            userSubscription: {
                $cond: {
                    if: {
                        $gt: [{ $size: '$userSubscription' }, 0]
                    },
                    then: {
                        subscriptionId: { $arrayElemAt: ['$userSubscription._id', 0] },
                        startDate: { $arrayElemAt: ['$userSubscription.startDate', 0] },
                        endDate: { $arrayElemAt: ['$userSubscription.endDate', 0] },
                        status: { $arrayElemAt: ['$userSubscription.status', 0] },
                        billingCycle: { $arrayElemAt: ['$userSubscription.billingCycle', 0] },
                        autoRenew: { $arrayElemAt: ['$userSubscription.autoRenew', 0] },
                        paymentStatus: { $arrayElemAt: ['$userSubscription.paymentStatus', 0] },
                        cancellationDate: { $arrayElemAt: ['$userSubscription.cancellationDate', 0] }
                    },
                    else: null
                }
            }
        }
    },
    {
        $sort: {
            'pricing.monthly': 1 
       
        }
    }
];
  } catch (error) {
    handleError(error, res);
  }
}