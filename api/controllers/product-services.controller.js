
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import Products from '../models/products.schema.js'
import  httpStatus  from 'http-status';
import handleError from "../utils/handleError.js";
import { matchedData } from "express-validator";





export const updateProductServicesController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = req.params;
        const { services } = validatedData;

        const updatedProduct = await Products.findOneAndUpdate(
            { _id: productId, seller: userId },
            { services: services || [] },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Product not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Services updated successfully', {
                services: updatedProduct.services
            })
        );

        markStepCompleteAsync(productId, 'services');

    } catch (err) {
        handleError(res, err);
    }
};





export const getProductServicesController = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const product = await Products.findOne(
            { _id: productId, seller: userId }
        ).select('services');

        if (!product) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Product not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Services retrieved successfully', 
                product.services
            )
        );

    } catch (err) {
        handleError(res, err);
    }
};
