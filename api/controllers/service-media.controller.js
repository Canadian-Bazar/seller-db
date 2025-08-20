import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Services from '../models/service.schema.js'
import ServiceMedia from '../models/service-media.schema.js'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'

export const syncServiceMediaController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = req.params;
        const { images, videos=[], warranty={}, industryCertifications = [] , brochure=null} = validatedData;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
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

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const media = await ServiceMedia.findOne({ serviceId: serviceId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, media)
        );

    } catch (err) {
        handleError(res, err);
    }
};