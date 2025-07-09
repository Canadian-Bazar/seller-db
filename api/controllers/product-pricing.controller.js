import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Products from '../models/products.schema.js'
import {matchedData} from 'express-validator'
import  httpStatus  from 'http-status';
import mongoose from 'mongoose'
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'
import ProductPricing from '../models/product-pricing.schema.js'
import quotationsSchema from '../models/quotations.schema.js'

export const syncProductPricingController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = req.params;
        const {  quantityPriceTiers, leadTime  , minPrice , maxPrice } = validatedData;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        // const moq = quantityPriceTiers[0].min
        // const minPrice = quantityPriceTiers[0].price 




        const updatedPricing = await ProductPricing.findOneAndUpdate(
            { productId: productId },
            {
                productId: productId,
                quantityPriceTiers: quantityPriceTiers || [],
                leadTime: leadTime || []
            },
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );


        await Products.findByIdAndUpdate(
            productId,
            {
                minPrice: minPrice || 0,
                maxPrice: maxPrice || 0
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
        const product = await Products.findById(productId).select('minPrice maxPrice');

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                ...pricing?.toObject(),
                minPrice: product?.minPrice || 0,
                maxPrice: product?.maxPrice || 0
            })
        );


    } catch (err) {
        handleError(res, err);
    }
};