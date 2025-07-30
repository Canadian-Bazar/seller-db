import handleError from "../utils/handleError.js";
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData } from "express-validator";
import Career from '../models/career.schema.js'
import httpStatus from "http-status";
import mongoose from "mongoose";





export const getVerifiedCareers = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { 
            page = 1, 
            limit = 10, 
            postalCode, 
            state, 
            city, 
            category,
            search 
        } = validatedData;

        const effectiveLimit = Math.min(Number(limit), 50);
        const effectivePage = Number(page);
        const skip = (effectivePage - 1) * effectiveLimit;

        const filter = {
            isVerified: true
        };

        if (postalCode) {
            filter.postalCode = { $regex: postalCode, $options: 'i' };
        }

        if (state) {
            filter.state = { $regex: state, $options: 'i' };
        }

        if (city) {
            filter.city = { $regex: city, $options: 'i' };
        }

        if (category) {
            if (!mongoose.Types.ObjectId.isValid(category)) {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid category ID format');
            }
            filter.category = new mongoose.Types.ObjectId(category);
        }

        const aggregationPipeline = [
            {
                $match: filter
            },
            
            {
                $lookup: {
                    from: 'Category', 
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            {
                $unwind: {
                    path: '$categoryDetails',
                    preserveNullAndEmptyArrays: true
                }
            },

            ...(search ? [{
                $match: {
                    $or: [
                        { fullName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { phoneNumber: { $regex: search, $options: 'i' } },
                        { 'categoryDetails.name': { $regex: search, $options: 'i' } }
                    ]
                }
            }] : []),

            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    street: 1,
                    city: 1,
                    state: 1,
                    postalCode: 1,
                    resume: 1,
                    coverLetter: 1,
                    isVerified: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    
                    category: {
                        _id: '$categoryDetails._id',
                        name: '$categoryDetails.name',
                        description: '$categoryDetails.description'
                    },
                    
                    fullAddress: {
                        $concat: [
                            '$street', ', ',
                            '$city', ', ',
                            '$state', ' ',
                            '$postalCode'
                        ]
                    }
                }
            },

            {
                $sort: { createdAt: -1 }
            }
        ];

        const paginationPipeline = [
            ...aggregationPipeline,
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: effectiveLimit }
                    ],
                    count: [
                        { $count: 'total' }
                    ]
                }
            }
        ];

        const [result] = await Career.aggregate(paginationPipeline);
        
        const careers = result.data || [];
        const totalCareers = result.count[0]?.total || 0;
        const totalPages = Math.ceil(totalCareers / effectiveLimit);

        const response = {
            docs: careers,
            totalDocs: totalCareers,
            limit: effectiveLimit,
            page: effectivePage,
            totalPages,
            hasNextPage: effectivePage < totalPages,
            hasPrevPage: effectivePage > 1,
          
        };

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));

    } catch (err) {
        console.error('Error fetching verified careers:', err);
        handleError(res, err);
    }
};