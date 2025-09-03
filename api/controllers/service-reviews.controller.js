import ServiceReview from '../models/service-reviews.schema.js'
import Service from '../models/service.schema.js'
import handleError from "../utils/handleError.js";
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import httpStatus from "http-status"; 
import mongoose from "mongoose";
import { matchedData } from "express-validator";

export const getReviewsByServiceId = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = validatedData;

        const service = await Service.findOne({
            _id: mongoose.Types.ObjectId.createFromHexString(serviceId),
            seller: req.user._id
        });

        if (!service) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service not found or unauthorized');
        }

        const query = {
            service: mongoose.Types.ObjectId.createFromHexString(serviceId)
        };

        if (validatedData.rating) {
            query.rating = validatedData.rating;
        }

        if (validatedData.search) {
            query.$or = [
                { 'buyer.name': { $regex: validatedData.search, $options: 'i' } },
                { 'buyer.email': { $regex: validatedData.search, $options: 'i' } }
            ];
        }

        const page = validatedData.page || 1;
        const limit = Math.min(validatedData.limit || 20, 20);
        const skip = (page - 1) * limit;

        let sort = {};
        if (validatedData.sortByRating === 'asc' || validatedData.sortByRating === 'desc') {
            sort.rating = validatedData.sortByRating === 'asc' ? 1 : -1;
        } else if (validatedData.oldestFirst) {
            sort.createdAt = 1;
        } else {
            sort.createdAt = -1;
        }

        const docs = await ServiceReview.find(query)
            .populate('buyer', 'name email profilePic avatar')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalDocs = await ServiceReview.countDocuments(query);
        const totalPages = Math.ceil(totalDocs / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        const response = {
            docs,
            hasNext,
            hasPrev,
            totalPages,
            currentPage: page,
            totalDocs,
            limit
        };

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
    } catch (err) {
        handleError(res, err);
    }
};

export const getAllServiceReviewsForSeller = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const sellerId = req.user._id;

        const sellerServices = await Service.find({ seller: sellerId }).select('_id');
        const sellerServiceIds = sellerServices.map(s => s._id);

        let filteredServiceIds = sellerServiceIds;

        if (validatedData.serviceIds && validatedData.serviceIds.length > 0) {
            const requestedIds = Array.isArray(validatedData.serviceIds)
                ? validatedData.serviceIds.map(id => mongoose.Types.ObjectId.createFromHexString(id))
                : [mongoose.Types.ObjectId.createFromHexString(validatedData.serviceIds)];

            filteredServiceIds = sellerServiceIds.filter(id =>
                requestedIds.some(reqId => reqId.equals(id))
            );
        }

        if (filteredServiceIds.length === 0) {
            return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, {
                docs: [],
                hasNext: false,
                hasPrev: false,
                totalPages: 0,
                currentPage: validatedData.page || 1,
                totalDocs: 0,
                limit: validatedData.limit || 20
            }));
        }

        const reviewQuery = {
            service: { $in: filteredServiceIds }
        };

        if (validatedData.rating) {
            reviewQuery.rating = validatedData.rating;
        }

        if (validatedData.search) {
            reviewQuery.$or = [
                { 'buyer.name': { $regex: validatedData.search, $options: 'i' } },
                { 'buyer.email': { $regex: validatedData.search, $options: 'i' } },
                { comment: { $regex: validatedData.search, $options: 'i' } }
            ];
        }

        const page = validatedData.page || 1;
        const limit = Math.min(validatedData.limit || 20, 20);
        const skip = (page - 1) * limit;

        let sort = {};

        console.log(validatedData.oldestFirst)
      if (validatedData.sortByRating === 'asc' || validatedData.sortByRating === 'desc') {
                sort.rating = validatedData.sortByRating === 'asc' ? 1 : -1;
                }

             const oldestFirst = validatedData.oldestFirst === 'true';

                if (oldestFirst) {
                    sort.createdAt = 1;
                } else {
                    sort.createdAt = -1;
                }

                console.log(sort)

        const docs = await ServiceReview.find(reviewQuery)
            .populate('buyer', 'name email profilePic avatar')
            .populate('service', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalDocs = await ServiceReview.countDocuments(reviewQuery);
        const totalPages = Math.ceil(totalDocs / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        const response = {
            docs,
            hasNext,
            hasPrev,
            totalPages,
            currentPage: page,
            totalDocs,
            limit
        };

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
    } catch (err) {
        handleError(res, err);
    }
};

export const getServiceReviewsAnalytics = async (req, res) => {
    try {
        const sellerId = req.user._id;

        // Get all seller's services
        const services = await Service.find({ seller: sellerId }).select('_id');
        const serviceIds = services.map(s => s._id);

        // Get review analytics
        const analytics = await ServiceReview.aggregate([
            { $match: { service: { $in: serviceIds } } },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            },
            {
                $addFields: {
                    averageRating: { $round: ['$averageRating', 1] },
                    ratingCounts: {
                        5: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 5] } } } },
                        4: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 4] } } } },
                        3: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 3] } } } },
                        2: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 2] } } } },
                        1: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 1] } } } }
                    }
                }
            },
            {
                $project: {
                    totalReviews: 1,
                    averageRating: 1,
                    ratingCounts: 1
                }
            }
        ]);

        const response = analytics.length > 0 ? analytics[0] : {
            totalReviews: 0,
            averageRating: 0,
            ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
    } catch (err) {
        handleError(res, err);
    }
};