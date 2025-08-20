

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

import { ProductMonthlyPerformance, ProductYearlyPerformance } from '../models/product-performance-analytics.schema.js'
import { ProductMonthlyAnalytics, ProductYearlyAnalytics } from '../models/product-analytics.schema.js'




const initializeProductAnalytics = async (productId) => {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // 1-12
  
  try {
    // Initialize all analytics schemas in parallel for better performance
    await Promise.all([
      // Initialize Monthly Performance for current month
      ProductMonthlyPerformance.create({
        productId,
        year: currentYear,
        month: currentMonth,
        dailyMetrics: [], // Will be populated as days progress
        weeklyMetrics: [], // Will be populated as weeks progress
        monthlyTotals: {
          viewCount: 0,
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0,
          popularityScore: 0,
          bestsellerScore: 0
        }
      }),
      
      // Initialize Yearly Performance for current year
      ProductYearlyPerformance.create({
        productId,
        year: currentYear,
        monthlyMetrics: [{
          month: currentMonth,
          viewCount: 0,
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0,
          popularityScore: 0,
          bestsellerScore: 0
        }],
        yearlyTotals: {
          viewCount: 0,
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0,
          popularityScore: 0,
          bestsellerScore: 0
        }
      }),
      
      // Initialize Monthly Sales Analytics for current month
      ProductMonthlyAnalytics.create({
        productId,
        year: currentYear,
        month: currentMonth,
        dailyMetrics: [], // Will be populated as days progress
        weeklyMetrics: [], // Will be populated as weeks progress
        monthlyTotals: {
          salesCount: 0,
          salesAmount: 0,
          profit: 0
        }
      }),
      
      // Initialize Yearly Sales Analytics for current year
      ProductYearlyAnalytics.create({
        productId,
        year: currentYear,
        monthlyMetrics: [{
          month: currentMonth,
          salesCount: 0,
          salesAmount: 0,
          profit: 0
        }],
        yearlyTotals: {
          salesCount: 0,
          salesAmount: 0,
          profit: 0
        }
      })
    ])
    
    console.log(`Both Performance and Sales Analytics initialized for product: ${productId}`)
  } catch (error) {
    // Log error but don't fail product creation
    console.error('Failed to initialize product analytics:', error)
    
    // Optionally, you could add this to a background job queue
    // to retry initialization later
  }
}

// Alternative: You could also add this as a post-save hook in your Product model
// ProductSchema.post('save', async function(doc) {
//   if (this.isNew) {
//     await initializeProductAnalytics(doc._id)
//   }
// })

// Utility function to ensure both analytics schemas exist (for existing products)
export const ensureProductAnalytics = async (productId) => {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  
  const promises = []
  
  // Check and create Monthly Performance if needed
  const monthlyPerformanceExists = await ProductMonthlyPerformance.findOne({
    productId,
    year: currentYear,
    month: currentMonth
  })
  
  if (!monthlyPerformanceExists) {
    promises.push(
      ProductMonthlyPerformance.create({
        productId,
        year: currentYear,
        month: currentMonth,
        dailyMetrics: [],
        weeklyMetrics: [],
        monthlyTotals: {
          viewCount: 0,
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0,
          popularityScore: 0,
          bestsellerScore: 0
        }
      })
    )
  }
  
  // Check and create Yearly Performance if needed
  const yearlyPerformanceExists = await ProductYearlyPerformance.findOne({
    productId,
    year: currentYear
  })
  
  if (!yearlyPerformanceExists) {
    promises.push(
      ProductYearlyPerformance.create({
        productId,
        year: currentYear,
        monthlyMetrics: [{
          month: currentMonth,
          viewCount: 0,
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0,
          popularityScore: 0,
          bestsellerScore: 0
        }],
        yearlyTotals: {
          viewCount: 0,
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0,
          popularityScore: 0,
          bestsellerScore: 0
        }
      })
    )
  }
  
  // Check and create Monthly Sales Analytics if needed
  const monthlyAnalyticsExists = await ProductMonthlyAnalytics.findOne({
    productId,
    year: currentYear,
    month: currentMonth
  })
  
  if (!monthlyAnalyticsExists) {
    promises.push(
      ProductMonthlyAnalytics.create({
        productId,
        year: currentYear,
        month: currentMonth,
        dailyMetrics: [],
        weeklyMetrics: [],
        monthlyTotals: {
          salesCount: 0,
          salesAmount: 0,
          profit: 0
        }
      })
    )
  }
  
  // Check and create Yearly Sales Analytics if needed
  const yearlyAnalyticsExists = await ProductYearlyAnalytics.findOne({
    productId,
    year: currentYear
  })
  
  if (!yearlyAnalyticsExists) {
    promises.push(
      ProductYearlyAnalytics.create({
        productId,
        year: currentYear,
        monthlyMetrics: [{
          month: currentMonth,
          salesCount: 0,
          salesAmount: 0,
          profit: 0
        }],
        yearlyTotals: {
          salesCount: 0,
          salesAmount: 0,
          profit: 0
        }
      })
    )
  }
  
  if (promises.length > 0) {
    await Promise.all(promises)
    console.log(`Missing analytics schemas created for product: ${productId}`)
  }
}

export const createProductController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;

        const { 
            name, 
            categoryId, 
            about, 
            moq ,
        } = validatedData;


        const seller = await Seller.findById(userId)

        console.log(seller)




        if(seller.approvalStatus!=='approved'){
            throw buildErrorObject(httpStatus.UNAUTHORIZED , 'You are not yet verified')
        }


        const categoryExists = await Category.exists({_id:categoryId})

        if(!categoryExists){
            throw buildErrorObject(httpStatus.BAD_REQUEST , 'Invalid Category Selected')
        }



        

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
            moq :moq ,
            
            isComplete: false,
            completionPercentage: 0,
            incompleteSteps: ['productInfo', 'attributes', 'images', 'pricing'],
            stepStatus: {
                productInfo: false,
                attributes: false,
                images: false,
                pricing: false,
                
                services: false,
            }
        });

        const savedProduct = await newProduct.save();
         markStepCompleteAsync(savedProduct._id, 'productInfo');


        res.status(httpStatus.CREATED).json(
            buildResponse(httpStatus.CREATED, savedProduct )
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
        ).select('name slug categoryId about moq completionPercentage incompleteSteps stepStatus brochure')
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