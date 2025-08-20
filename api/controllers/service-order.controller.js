import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Services from '../models/service.schema.js'
import ServiceOrderSchema from '../models/service-order.schema.js'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'

export const syncServiceOrderController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = req.params;
        const { moq=null, standardLeadTime, rushOptions =[] } = validatedData;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const updatedPricing = await ServiceOrderSchema.findOneAndUpdate(
            { serviceId: serviceId },
            {
                moq: moq,
                standardLeadTime: standardLeadTime,
                rushOptions: rushOptions
            },
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Service pricing synchronized successfully', {
                pricing: updatedPricing
            })
        );

        markStepCompleteAsync(serviceId, 'order' , 'service');

    } catch (err) {
        handleError(res, err);
    }
};

export const getServiceOrderController = async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const pricing = await ServiceOrderSchema.findOne({ serviceId: serviceId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, pricing)
        );

    } catch (err) {
        handleError(res, err);
    }
};