import Seller from '../models/seller.schema.js'
import handleError from '../utils/handleError.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import buildResponse from '../utils/buildResponse.js'
import httpStatus from 'http-status'



export const getCertificationsController = async (req, res) => {
    try {
        const sellerId = req.user._id;
        
        const seller = await Seller.findById(sellerId).select('certifications').lean().exec();
        
        if (!seller) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Seller not found');
        }

        const certifications = seller.certifications || [];

        const response = {
            docs: certifications,
            totalPages: 1,
            hasPrevPage: false,
            hasNextPage: false,
        }

        return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response))
    } catch (error) {
        return handleError(res, error)
    }
}
