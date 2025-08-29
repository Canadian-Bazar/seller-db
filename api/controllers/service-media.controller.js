import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Services from '../models/service.schema.js'
import ServiceMedia from '../models/service-media.schema.js'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'
import Certifications from '../models/certifications.schema.js'

export const syncServiceMediaController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = req.params;
        const { images, videos=[], warranty={}, industryCertifications = [] , brochure=null} = validatedData;

        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        if(industryCertifications.length>0){
            const certifications = await Certifications.find({_id:{
                $in:industryCertifications ,
                
            } , isActive:true ,
                isDeleted:false})


            if(certifications.length !== industryCertifications.length){
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'One or more certifications are invalid');
            }
        }

        const updatedMedia = await ServiceMedia.findOneAndUpdate(
            { serviceId: serviceId },
            {
                images: images,
                videos: videos,
                warranty: warranty,
                industryCertifications: industryCertifications ,
                brochure: brochure
            },
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Service media synchronized successfully', {
                media: updatedMedia
            })
        );

        markStepCompleteAsync(serviceId, 'media' , 'service');

    } catch (err) {
        handleError(res, err);
    }
};

export const getServiceMediaController = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const media = await ServiceMedia.findOne({ serviceId: serviceId }).populate('industryCertifications' , '-isDeleted -isActive -createdAt -updatedAt -__v').lean().exec();

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, media)
        );

    } catch (err) {
        handleError(res, err);
    }
};