import { markStepCompleteAsync } from '../helpers/markStepComplete.js';
import ProductVariation from '../models/product-variation.schema.js'
import Products from '../models/products.schema.js'
import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';






export const syncProductVariationsController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = req.params;
        const { variations, customizableOptions } = validatedData;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const updateData = {
            productId: productId,
            variations: variations || [],
            customizableOptions: customizableOptions || []
        };

        const updatedVariations = await ProductVariation.findOneAndUpdate(
            { productId: productId },
            updateData,
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Variations synchronized successfully', {
                variations: updatedVariations
            })
        );

        markStepCompleteAsync(productId, 'variations');

    } catch (err) {
        handleError(res, err);
    }
};

export const getProductVariationsController = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const variations = await ProductVariation.findOne({ productId: productId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK,  variations)
        );

    } catch (err) {
        handleError(res, err);
    }
};