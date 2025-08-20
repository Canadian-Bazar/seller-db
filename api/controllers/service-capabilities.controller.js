import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Services from '../models/service.schema.js'
import SerivesProcessAndCapability from '../models/service-process-capability.schema.js'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'

export const syncServiceCapabilitiesController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = validatedData;
        const { processType, materialsSupported, surfaceFinishAndCoatings =[], tolerance=null } = validatedData;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const updatedCapabilities = await SerivesProcessAndCapability.findOneAndUpdate(
            { serviceId: serviceId },
            {
                processType: processType,
                materialsSupported: materialsSupported,
                surfaceFinishAndCoatings: surfaceFinishAndCoatings,
                tolerance: tolerance
            },
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Service capabilities synchronized successfully', {
                capabilities: updatedCapabilities
            })
        );

        markStepCompleteAsync(serviceId, 'capabilities' , 'service');

    } catch (err) {
        handleError(res, err);
    }
};

export const getServiceCapabilitiesController = async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const capabilities = await SerivesProcessAndCapability.findOne({ serviceId: serviceId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, capabilities)
        );

    } catch (err) {
        handleError(res, err);
    }
};