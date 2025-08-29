import Certifications from '../models/certifications.schema.js'
import { matchedData } from 'express-validator'
import handleError from '../utils/handleError.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import buildResponse from '../utils/buildResponse.js'
import httpStatus from 'http-status'
import mongoose from 'mongoose'



export const getCertificationsController = async (req, res) => {
    try {
        const validatedData = matchedData(req)
        const page = Math.max(parseInt(validatedData.page) || 1, 1) ;
        const limit = Math.max(parseInt(validatedData.limit) || 10, 1);


        const filter = {
            isActive: true ,
            isDeleted: false

        }

        if(validatedData.search){
            filter.name = { $regex: `^${validatedData.search}` , $options:'i' }
        }


        const skip = (page - 1) * limit ;
        const certifications = await Certifications.find(filter).select('-__v -isDeleted -isActive').skip(skip).limit(limit).lean().exec();
        const totalDocs = await Certifications.countDocuments(filter).exec();
        const totalPages = Math.ceil(totalDocs / limit) || 1 ;

        const response ={
            docs:certifications ,

            totalPages ,
            hasPrevPage: page > 1 ,
            hasNextPage: page < totalPages ,
           
        }

        return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response))
    } catch (error) {
        return handleError(res, error)
    }
}
