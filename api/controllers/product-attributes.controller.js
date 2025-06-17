import ProductAttributes from '../models/product-attributes.schema.js'
import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Products from '../models/products.schema.js'
import {matchedData} from 'express-validator'
import  httpStatus  from 'http-status';
import mongoose from 'mongoose'
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'



export const syncProductAttributesController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = req.params;
        const { attributes } = validatedData;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const deletePromise = ProductAttributes.deleteMany({ productId: productId });
        
        const payload = attributes?.length > 0 ? attributes.map(item => ({
            ...item,
            productId: productId
        })) : [];

        await deletePromise;

        if (payload.length > 0) {
            await ProductAttributes.insertMany(payload, {
                ordered: false, 
                lean: true      
            });
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Attributes synchronized successfully')
        );

        markStepCompleteAsync(productId , 'attributes')

    } catch (err) {
        handleError(res, err);
    }
};


