import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Products from '../models/products.schema.js'
import {matchedData} from 'express-validator'
import  httpStatus  from 'http-status';
import mongoose from 'mongoose'
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'

export const syncProductPricingController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = req.params;
        const { basePrice, quantityPriceTiers, leadTime } = validatedData;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const updatedPricing = await ProductPricing.findOneAndUpdate(
            { productId: productId },
            {
                productId: productId,
                basePrice: basePrice,
                quantityPriceTiers: quantityPriceTiers || [],
                leadTime: leadTime || []
            },
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Pricing synchronized successfully', {
                pricing: updatedPricing
            })
        );

        markStepCompleteAsync(productId, 'pricing');

    } catch (err) {
        handleError(res, err);
    }
};




export const getProductPricingController = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const pricing = await ProductPricing.findOne({ productId: productId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Pricing retrieved successfully', pricing)
        );

    } catch (err) {
        handleError(res, err);
    }
};