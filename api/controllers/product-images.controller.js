
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import Products from '../models/products.schema.js'
import { uploadFile } from "../helpers/aws-s3.js";
import  httpStatus  from 'http-status';
import handleError from "../utils/handleError.js";
import { matchedData } from "express-validator";

export const syncImagesControllers = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const productId = validatedData.productId;
        const clientImages = validatedData.images || [];
        const userId = req.user?._id;

        const existingProduct = await Products.findOne({ _id: productId, seller: userId });
        if (!existingProduct) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        const existingImages = existingProduct.images || [];

        if (existingImages.length === 0 && 
            clientImages.length === 0 && 
            (!req.files || req.files.length === 0)) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'You need to upload at least one image');
        }

      
        const validExistingImages = existingImages.filter(img => clientImages.includes(img));

        let updatedImages = [...validExistingImages];

        if (req?.files && req.files.length > 0) {
            const newImageUrls = await uploadFile(req.files);
            updatedImages = [...updatedImages, ...newImageUrls];
        }

        await Products.findOneAndUpdate(
            { _id: productId, seller: userId },
            { $set: { images: updatedImages } }
        );

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, 'Images synced successfully'));
    } catch (err) {
        handleError(res, err);
    }
};


export const getProductImages = async(req , res)=>{
    try{
        const validatedData = matchedData(req)

        const productId = validatedData.productId

        const productImages = await Products.findById(productId).select('images')

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK , productImages.images))


    }catch(err){
        handleError(res , err)
    }
}
