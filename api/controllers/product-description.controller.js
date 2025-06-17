import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Products from '../models/products.schema.js'
import {matchedData} from 'express-validator'
import  httpStatus  from 'http-status';
import mongoose from 'mongoose'
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'


export const syncProductDescriptionController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = req.params;
        const { points, attributes } = validatedData;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const updateData = {
            productId: productId,
            points: points || [],
            attributes: attributes || []
        };

        let finalImages = validatedData.images || []; 
        
        if (req?.files && req.files.length > 0) {
            const newImageUrls = await uploadFile(req.files);
            finalImages = [...finalImages, ...newImageUrls];
        }
        
        updateData.images = finalImages;

        const updatedDescription = await ProductDescription.findOneAndUpdate(
            { productId: productId },
            updateData,
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Description synchronized successfully', {
                description: updatedDescription
            })
        );

        markStepCompleteAsync(productId, 'description');

    } catch (err) {
        handleError(res, err);
    }
};