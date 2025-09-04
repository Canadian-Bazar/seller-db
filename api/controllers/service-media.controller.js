import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Services from '../models/service.schema.js'
import ServiceMedia from '../models/service-media.schema.js'
import Seller from '../models/seller.schema.js'
import { matchedData } from 'express-validator'
import httpStatus from 'http-status';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'

export const syncServiceMediaController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { serviceId } = req.params;
        const { images, videos=[], warranty={}, industryCertifications = [] , brochure=null} = validatedData;

        const serviceExists = await Services.exists({ _id: serviceId });
        if (!serviceExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such service found');
        }

        if(industryCertifications.length > 0){
            // Get seller's profile to validate certifications
            const sellerId = req.user._id;
            const seller = await Seller.findById(sellerId).select('certifications').lean().exec();
            
            if (!seller) {
                throw buildErrorObject(httpStatus.NOT_FOUND, 'Seller not found');
            }

            const sellerCertifications = seller.certifications || [];
            
            // Check if all provided certifications exist in seller's profile
            const invalidCertifications = [];
            
            for (const providedCert of industryCertifications) {
                const matchingCert = sellerCertifications.find(sellerCert => 
                    sellerCert.name === providedCert.name && sellerCert.url === providedCert.url
                );
                
                if (!matchingCert) {
                    invalidCertifications.push(`${providedCert.name} (${providedCert.url})`);
                }
            }

            if(invalidCertifications.length > 0){
                throw buildErrorObject(httpStatus.BAD_REQUEST, 
                    `Invalid certifications: ${invalidCertifications.join(', ')}. Please add them to your profile first.`);
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

        const media = await ServiceMedia.findOne({ serviceId: serviceId }).lean().exec();

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, media)
        );

    } catch (err) {
        handleError(res, err);
    }
};