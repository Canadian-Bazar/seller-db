import Review from '../models/review.schema.js'
import Product from '../models/products.schema.js'
import handleError from "../utils/handleError.js";
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import httpStatus from "http-status"; 
import mongoose from "mongoose";
import { matchedData } from "express-validator";

export const getReviewsByProductId = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { productId } = validatedData;

        const product = await Product.findOne({
            _id: mongoose.Types.ObjectId.createFromHexString(productId),
            seller: req.user._id
        });

        if (!product) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Product not found or unauthorized');
        }

        const query = {
            product: mongoose.Types.ObjectId.createFromHexString(productId)
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

        const docs = await Review.find(query)
            .populate('buyer', 'name email profilePic avatar')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalDocs = await Review.countDocuments(query);
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

export const getAllReviewsForSeller = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const sellerId = req.user._id;

        const sellerProducts = await Product.find({ seller: sellerId }).select('_id');
        const sellerProductIds = sellerProducts.map(p => p._id);

        let filteredProductIds = sellerProductIds;

        if (validatedData.productIds && validatedData.productIds.length > 0) {
            const requestedIds = Array.isArray(validatedData.productIds)
                ? validatedData.productIds.map(id => mongoose.Types.ObjectId.createFromHexString(id))
                : [mongoose.Types.ObjectId.createFromHexString(validatedData.productIds)];

            filteredProductIds = sellerProductIds.filter(id =>
                requestedIds.some(reqId => reqId.equals(id))
            );
        }

        if (filteredProductIds.length === 0) {
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
            product: { $in: filteredProductIds }
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

        const docs = await Review.find(reviewQuery)
            .populate('buyer', 'name email profilePic avatar')
            .populate('product', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalDocs = await Review.countDocuments(reviewQuery);
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


export const getReviewsAnalytics = async (req, res) => {
    try {
        const sellerId = req.user._id;

        // Get all seller's products
        const products = await Product.find({ seller: sellerId }).select('_id');
        const productIds = products.map(p => p._id);

        // Get review analytics
        const analytics = await Review.aggregate([
            { $match: { product: { $in: productIds } } },
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