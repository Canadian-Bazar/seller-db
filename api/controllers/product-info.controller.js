

import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import Products from '../models/products.schema.js'
import { uploadFile } from "../helpers/aws-s3.js";
import  httpStatus  from 'http-status';
import handleError from "../utils/handleError.js";
import { matchedData } from "express-validator";
import Seller from '../models/seller.schema.js'
import Category from '../models/category.schema.js'
import { markStepCompleteAsync } from "../helpers/markStepComplete.js";



export const createProductController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;

        const { 
            name, 
            categoryId, 
            about, 
        } = validatedData;


        const seller = await Seller.findById(userId)




        if(seller.approvalStatus!=='approved'){
            throw buildErrorObject(httpStatus.UNAUTHORIZED , 'You are not yet verified')
        }


        const categoryExists = await Category.exists({_id:categoryId})

        if(!categoryExists){
            throw buildErrorObject(httpStatus.BAD_REQUEST , 'Invalid Category Selected')
        }



        //need to add condition that only after seller has completed his profile then only he should be able to create product
        

        const newProduct = new Products({
            name: name,
            seller: userId,
            categoryId: categoryId,
            about: about || [],

            
            // Default values for required fields
            minPrice: 0,
            maxPrice: 0,
            deliveryDays: 1,
            isCustomizable: false,
            
            // Initialize completion tracking
            isComplete: false,
            completionPercentage: 0,
            incompleteSteps: ['productInfo', 'attributes', 'images', 'pricing', 'variations', 'services', 'description'],
            stepStatus: {
                productInfo: false,
                attributes: false,
                images: false,
                pricing: false,
                variations: false,
                services: false,
                description: false
            }
        });

        const savedProduct = await newProduct.save();
         markStepCompleteAsync(savedProduct._id, 'productInfo');


        res.status(httpStatus.CREATED).json(
            buildResponse(httpStatus.CREATED, 'Product created successfully', )
        );


    } catch (err) {
        handleError(res, err);
    }
};

export const updateProductInfoController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { productId } = req.params;
        const { name, categoryId, about } = validatedData;

        const productExists = await Products.exists({ _id: productId, seller: userId });
        if (!productExists) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
         }

        const updateData = {};
        
        if (name !== undefined) {
            updateData.name = name;
        }
        
        if (categoryId !== undefined) {
            const categoryExists = await Category.exists({ _id: categoryId });
            if (!categoryExists) {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid Category Selected');
            }
            updateData.categoryId = categoryId;
        }
        
        if (about !== undefined) {
            updateData.about = about;
        }

        const updatedProduct = await Products.findOneAndUpdate(
            { _id: productId, seller: userId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Product not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Product info updated successfully')
        );

        markStepCompleteAsync(productId, 'productInfo');

    } catch (err) {
        handleError(res, err);
    }
};


export const getProductInfoController = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const product = await Products.findOne(
            { _id: productId, seller: userId }
        ).select('name slug categoryId about moq completionPercentage incompleteSteps stepStatus')
         .populate('categoryId', 'name');

        if (!product) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Product not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK,  product)
        );

    } catch (err) {
        handleError(res, err);
    }
};