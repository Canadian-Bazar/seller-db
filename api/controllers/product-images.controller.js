
import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import Products from '../models/products.schema.js'
import { uploadFile } from "../helpers/aws-s3.js";
import  httpStatus  from 'http-status';
import handleError from "../utils/handleError.js";
import { matchedData } from "express-validator";


export const syncImagesControllers = async(req , res)=>{
    try{
        const validatedData = matchedData(req)
        const productId = validatedData.productId
        const images = validatedData.images || []
        const userId = req.user?._id;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
        }

        if ((!images || images.length === 0) && (!req.files || req.files.length === 0)) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'You need to upload at least one image');
        }

        let updatedData = [...images]

        if(req?.files && req?.files.length > 0){
            const newImageUrls = await uploadFile(req.files)
            updatedData = [...images, ...newImageUrls]
        }

        await Products.findOneAndUpdate(
            { _id: productId, seller: userId },
            { $set: { images: updatedData } },
        );

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK , 'Images Uploaded'))
    }catch(err){
        handleError(res , err)
    }
}



export const getProductImages = async(req , res)=>{
    try{
        const validatedData = matchedData(req)

        const productId = validatedData.productId

        const productImages = await Products.findOneById(productId).select('images')

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK , productImages.images))


    }catch(err){
        handleError(res , err)
    }
}
