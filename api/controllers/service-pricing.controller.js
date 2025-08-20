import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Services from '../models/service.schema.js'
import ServicePricing from '../models/service-pricing.schema.js'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'

export const syncServicePricingController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = req.params;
        const { perModelPrice=null, perHourPrice = null, perBatchPrice = null, volume = null, customQuoteEnabled = false } = validatedData;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const updatedPricing = await ServicePricing.findOneAndUpdate(
            { serviceId: serviceId },
            {
                perModelPrice: perModelPrice,
                perHourPrice: perHourPrice,
                perBatchPrice: perBatchPrice,
                volume: volume,
                customQuoteEnabled: customQuoteEnabled
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

        markStepCompleteAsync(serviceId, 'pricing', 'service');

    } catch (err) {
        handleError(res, err);
    }
};

export const getServicePricingController = async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const pricing = await ServicePricing.findOne({ serviceId: serviceId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, pricing)
        );

    } catch (err) {
        handleError(res, err);
    }
};