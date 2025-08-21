import handleError from "../utils/handleError.js";
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import StoreClaimUsers from '../models/store-claim-users.schema.js'
import  { matchedData } from 'express-validator';
import httpStatus from 'http-status';






export const getStoreByIdController = async (req, res) => {
    try {
        const validatedData = matchedData(req); 
        const storeId = validatedData.id;   

        const store = await StoreClaimUsers.findById(storeId);
        if (!store) {
            return res.status(httpStatus.NOT_FOUND).json(buildErrorObject(httpStatus.NOT_FOUND, 'Store not found'));
        }

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, store));
    } catch (err) {
        handleError(res, err);
    }
};


