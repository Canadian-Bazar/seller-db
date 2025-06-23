import { ProductMonthlyAnalytics , ProductYearlyAnalytics } from "../models/product-analytics.schema.js";
import moment from "moment";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData } from 'express-validator';
import httpStatus from 'http-status'
import buildErrorObject from "../utils/buildErrorObject.js";
import getDailySalesData from "../analytics/getDailySalesData.js";
import getWeeklySalesData from "../analytics/getWeeklySalesData.js";
import getMonthlySalesData from "../analytics/getMonthlySalesData.js";
import getYearlySalesData from "../analytics/getYearlySalesData.js";
import Product from "../models/products.schema.js";





export const getProductAnalytics = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { products, from, to, granularity, type = 'salesCount' } = validatedData;
    
    const fromDate = moment(from);
    const endDate = moment(to);
    
    if (!fromDate.isValid() || !endDate.isValid()) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid date format. Please use a valid date format.');
    }
    
    if (fromDate.isAfter(endDate)) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'From date cannot be after end date.');
    }
    
    const sellerId = req.user._id;
    let verifiedProductIds = [];
    
    if (!products || products.length === 0) {
      const sellerProducts = await Product.find({ sellerId }, { _id: 1 });
      
      if (sellerProducts.length === 0) {
        return res.status(httpStatus.OK).json(
          buildResponse(httpStatus.OK, { x: [], y: [] })
        );
      }
      
      verifiedProductIds = sellerProducts.map(product => product._id.toString());
    } else {
      const productOwnership = await Product.find({
        _id: { $in: products },
        sellerId
      }, { _id: 1 });
      
      if (productOwnership.length === 0) {
        throw buildErrorObject(httpStatus.FORBIDDEN, 'Access denied. You can only access analytics for your own products.');
      }
      
      const foundProductIds = productOwnership.map(p => p._id.toString());
      const unauthorizedProducts = products.filter(id => !foundProductIds.includes(id));
      
      if (unauthorizedProducts.length > 0) {
        throw buildErrorObject(httpStatus.FORBIDDEN, `Access denied. You don't own these products: ${unauthorizedProducts.join(', ')}`);
      }
      
      verifiedProductIds = foundProductIds;
    }
    
    let analyticsData;
    
    switch (granularity) {
      case 'days':
        analyticsData = await getDailySalesData(verifiedProductIds, fromDate, endDate, type);
        break;
      case 'weeks':
        analyticsData = await getWeeklySalesData(verifiedProductIds, fromDate, endDate, type);
        break;
      case 'months':
        analyticsData = await getMonthlySalesData(verifiedProductIds, fromDate, endDate, type);
        break;
      case 'years':
        analyticsData = await getYearlySalesData(verifiedProductIds, fromDate, endDate, type);
        break;
    }
    
    res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, analyticsData)
    );
    
  } catch (err) {
    handleError(res, err);
  }
};