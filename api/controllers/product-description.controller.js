import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import Products from '../models/products.schema.js'
import {matchedData} from 'express-validator'
import  httpStatus  from 'http-status';
import mongoose from 'mongoose'
import { markStepCompleteAsync } from '../helpers/markStepComplete.js'
import { uploadFile } from '../helpers/aws-s3.js'
import ProductDescription from '../models/product-description.schema.js'


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
            buildResponse(httpStatus.OK, 'Description data synchronized successfully', {
                description: updatedDescription
            })
        );

        markStepCompleteAsync(productId, 'description');

    } catch (err) {
        handleError(res, err);
    }
};


export const syncProductDescriptionImagesController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = validatedData;

        console.log('Request Files:', validatedData.images);

        const clientImages = validatedData.images || []

        console.log("clientImages" , clientImages)

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const existingDescription = await ProductDescription.findOne({ productId: productId });
        const existingImages = existingDescription?.images || [];
      
        const validExistingImages = existingImages.filter(img => clientImages.includes(img));

        let finalImages = [...validExistingImages];

        if (req?.files && req.files.length > 0) {
            const newImageUrls = await uploadFile(req.files);
            finalImages = [...finalImages, ...newImageUrls];
        }

        const updatedDescription = await ProductDescription.findOneAndUpdate(
            { productId: productId },
            { $set: { images: finalImages } },
            {
                upsert: true,
                new: true,
                runValidators: true
            }
        );

        console.log('Updated Description:', updatedDescription);

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Description images synchronized successfully')
        );

    } catch (err) {

        
        handleError(res, err);
    }
};


export const getProductDescriptionController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = validatedData;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const productDescription = await ProductDescription.findOne({ productId: productId });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK,  
                 productDescription
            )
        );

    } catch (err) {
        handleError(res, err);
    }
};