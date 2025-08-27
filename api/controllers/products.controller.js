import { matchedData } from 'express-validator'
import Products from '../models/products.schema.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import buildResponse from '../utils/buildResponse.js'
import handleError from '../utils/handleError.js'
import mongoose from 'mongoose'
import httpStatus from 'http-status'
import ProductStats from '../models/products-stats.schema.js'
import ProductPricing from '../models/product-pricing.schema.js'
import ProductDescription from '../models/product-description.schema.js'
import ProductAttributes from '../models/product-attributes.schema.js'

import ProductVariation from '../models/product-variation.schema.js'









export const getProductsController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const pipeline = [];

    const page = parseInt(validatedData.page || 1, 10);
    const limit = Math.min(parseInt(validatedData.limit || 10, 10), 50);
    const offset = (page - 1) * limit;

    const sellerId = req.user._id;
    const matchStage = {
      seller: new mongoose.Types.ObjectId(sellerId)
    };

    console.log(validatedData.search)

    if (validatedData.search) {
      matchStage.name = {
        $regex: validatedData.search,
        $options: 'i'
      };
    }

    if (validatedData.isVerified) {
      matchStage.isVerified = true;
    }

    if (validatedData.inComplete) {
      matchStage.isComplete = false;
    }


    if(validatedData.isComplete){
      matchStage.completionPercentage = 100;
    }

    if (validatedData.categories && validatedData.categories.length > 0) {
      matchStage.categoryId = {
        $in: validatedData.categories.map(id => new mongoose.Types.ObjectId(id))
      };
    }

    pipeline.push({ $match: matchStage });

    // Lookup Category to get category name
    pipeline.push({
      $lookup: {
        from: 'Category',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category'
      }
    });
    pipeline.push({
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true
      }
    });

    // Lookup ProductStats to flatten important stats
    pipeline.push({
      $lookup: {
        from: 'ProductStats',
        localField: '_id',
        foreignField: 'productId',
        as: 'stats'
      }
    });
    pipeline.push({
      $unwind: {
        path: '$stats',
        preserveNullAndEmptyArrays: true
      }
    });

    // Sorting logic
    let sortStage = { createdAt: -1 };
    switch (validatedData.sortBy) {
      case 'mostViewed':
        sortStage = { 'stats.viewCount': -1 };
        break;
      case 'mostQuoted':
        sortStage = { 'stats.quotationCount': -1 };
        break;
      case 'mostAcceptedQuotations':
        sortStage = { 'stats.acceptedQuotationCount': -1 };
        break;
      case 'mostRejectedQuotations':
        sortStage = { 'stats.rejectedQuotationCount': -1 };
        break;
    }

    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: offset });
    pipeline.push({ $limit: limit });

    // Final projection
    pipeline.push({
      $project: {
        name: 1,
        isVerified: 1,
        avgRating: 1,
        images: 1,
        minPrice: 1,
        maxPrice: 1,
        deliveryDays: 1,
        isCustomizable: 1,
        moq: 1,
        createdAt: 1,
        isComplete:1 ,
        completionPercentage:1 ,
        incompleteSteps: 1 ,



        // From stats
        viewCount: '$stats.viewCount',
        quotationCount: '$stats.quotationCount',
        acceptedQuotationCount: '$stats.acceptedQuotationCount',
        rejectedQuotationCount: '$stats.rejectedQuotationCount',

        // From category
        categoryName: '$category.name'
      }
    });

    const products = await Products.aggregate(pipeline);

    const countResult = await Products.aggregate([
      { $match: matchStage },
      { $count: 'count' }
    ]);
    const total = countResult[0]?.count || 0;

    const response = {
      docs: products,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasPrev: page > 1,
      hasNext: page * limit < total
    };

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
  } catch (err) {
    handleError(res, err);
  }
};


export const getProductNamesController = async (req, res) => {
  try {
    const validatedData = matchedData(req);

    const page = parseInt(validatedData.page || 1, 10);
    const limit = Math.min(parseInt(validatedData.limit || 10, 10), 50);
    const skip = (page - 1) * limit;

    const matchStage = {
      seller: req.user._id,
      isComplete:true
    };

    if (validatedData.search) {
      matchStage.name = {
        $regex: validatedData.search,
        $options: 'i',
      };
    }

    const [products, totalProducts] = await Promise.all([
      Products.find(matchStage)
        .skip(skip)
        .limit(limit)
        .select('name _id'),
      Products.countDocuments(matchStage),
    ]);

    const response = {
      hasPrev: page > 1,
      hasNext: page * limit < totalProducts,
      docs: products,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    };

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK ,  hresponse));
  } catch (err) {
    return handleError(res, err);
  }
};




export const deleteProductController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { productId } = validatedData;

    const product = await Products.findOne({_id:productId , seller:req.user._id});

    if (!product) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Product not found');
    }


    if(parseInt(product.completionPercentage) === 100){
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'Product is complete and cannot be deleted');
    }



    await Promise.all([
      Products.findByIdAndDelete(productId),
      ProductStats.findOneAndDelete({ productId }),
      ProductPricing.findOneAndDelete({ productId }),
      ProductDescription.findOneAndDelete({ productId }),
      ProductAttributes.findOneAndDelete({ productId }),
      ProductVariation.findOneAndDelete({ productId })
    ]);
    


      res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, 'Product deleted successfully'));

 
  } catch (err) {
    handleError(res, err);
  }
};



export const archiveProductController = async(req , res)=>{
  try{
    const validatedData = matchedData(req)
    const { productId } = validatedData

    const product = await Products.findOne({_id:productId , seller:req.user._id});

    if(!product){
      throw buildErrorObject(httpStatus.NOT_FOUND , 'Product not found')
    }

    if(parseInt(product.completionPercentage) !== 100){
      throw buildErrorObject(httpStatus.BAD_REQUEST , 'Product is not complete and cannot be archived')
    }


    if(product.isArchived){
      throw buildErrorObject(httpStatus.BAD_REQUEST , 'Product is already archived')
    }

    product.isArchived = true
    await product.save()

    res.status(httpStatus.OK).json(buildResponse(httpStatus.OK , 'Product archived successfully'))
  }catch(err){
    handleError(res , err)
  }
}

