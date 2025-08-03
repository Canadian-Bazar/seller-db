import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Services from '../models/service.schema.js'
import ServiceCustomization from '../models/service-customization.schema.js'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'

export const syncServiceCustomizationController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = req.params;
        const { designImages, logo, colorChoices, rapidPrototype } = validatedData;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const updatedCustomization = await ServiceCustomization.findOneAndUpdate(
            { serviceId: serviceId },
            {
                designImages: designImages,
                logo: logo,
                colorChoices: colorChoices,
                rapidPrototype: rapidPrototype
            },
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Service customization synchronized successfully', {
                customization: updatedCustomization
            })
        );


        console.log('bro')

        markStepCompleteAsync(serviceId, 'customization' , 'service');

    } catch (err) {
        handleError(res, err);
    }
};

export const getServiceCustomizationController = async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Check if service exists
        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        const customization = await ServiceCustomization.findOne({ serviceId: serviceId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, customization)
        );

    } catch (err) {
        handleError(res, err);
    }
};