import { ProductMonthlyAnalytics , ProductYearlyAnalytics } from "../models/product-analytics.schema.js";
import moment from "moment";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData } from 'express-validator';
import httpStatus from 'http-status'
import buildErrorObject from "../utils/buildErrorObject.js";
import getDailySalesData from "../sales-analytics/getDailySalesData.js";
import getWeeklySalesData from "../sales-analytics/getWeeklySalesData.js";
import getMonthlySalesData from "../sales-analytics/getMonthlySalesData.js";
import getYearlySalesData from "../sales-analytics/getYearlySalesData.js";
import Product from "../models/products.schema.js";





const generateTimePeriods = (fromDate, endDate, granularity) => {
  const periods = [];
  const current = moment(fromDate);
  const end = moment(endDate);

  switch (granularity) {
    case 'days':
      while (current.isSameOrBefore(end, 'day')) {
        periods.push({
          label: current.format('YYYY-MM-DD'),
          displayLabel: current.format('MMM DD, YYYY'),
          value: current.format('YYYY-MM-DD'),
          year: current.year(),
          month: current.month() + 1,
          day: current.date(),
          weekday: current.format('dddd')
        });
        current.add(1, 'day');
      }
      break;

    case 'weeks':
      current.startOf('week');
      while (current.isSameOrBefore(end, 'week')) {
        const weekEnd = moment(current).endOf('week');
        periods.push({
          label: `${current.format('YYYY-MM-DD')} to ${weekEnd.format('YYYY-MM-DD')}`,
          displayLabel: `Week of ${current.format('MMM DD, YYYY')}`,
          value: current.week(),
          year: current.year(),
          week: current.week(),
          startDate: current.format('YYYY-MM-DD'),
          endDate: weekEnd.format('YYYY-MM-DD')
        });
        current.add(1, 'week');
      }
      break;

    case 'months':
      current.startOf('month');
      while (current.isSameOrBefore(end, 'month')) {
        periods.push({
          label: current.format('YYYY-MM'),
          displayLabel: current.format('MMMM YYYY'),
          value: current.format('YYYY-MM'),
          year: current.year(),
          month: current.month() + 1,
          monthName: current.format('MMMM'),
          startDate: current.format('YYYY-MM-DD'),
          endDate: current.endOf('month').format('YYYY-MM-DD')
        });
        current.add(1, 'month').startOf('month');
      }
      break;

    case 'years':
      current.startOf('year');
      while (current.isSameOrBefore(end, 'year')) {
        periods.push({
          label: current.format('YYYY'),
          displayLabel: current.format('YYYY'),
          value: current.year(),
          year: current.year(),
          startDate: current.format('YYYY-MM-DD'),
          endDate: current.endOf('year').format('YYYY-MM-DD')
        });
        current.add(1, 'year').startOf('year');
      }
      break;

    default:
      break;
  }

  return periods;
};

// Helper function to get overview statistics
const getOverviewStats = (fromDate, endDate, granularity) => {
  const totalDays = endDate.diff(fromDate, 'days') + 1;
  const totalWeeks = Math.ceil(totalDays / 7);
  const totalMonths = endDate.diff(fromDate, 'months') + 1;
  const totalYears = endDate.diff(fromDate, 'years') + 1;

  return {
    dateRange: {
      from: fromDate.format('YYYY-MM-DD'),
      to: endDate.format('YYYY-MM-DD'),
      totalDays,
      totalWeeks,
      totalMonths,
      totalYears
    },
    granularity,
    periodsCount: granularity === 'days' ? totalDays : 
                 granularity === 'weeks' ? totalWeeks :
                 granularity === 'months' ? totalMonths : totalYears
  };
};

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
        const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
        const overviewStats = getOverviewStats(fromDate, endDate, granularity);
        
        return res.status(httpStatus.OK).json(
          buildResponse(httpStatus.OK, { 
            x: [], 
            y: [],
            timePeriods,
            overview: overviewStats,
            productsAnalyzed: 0
          })
        );
      }

      verifiedProductIds = sellerProducts.map(product => product._id.toString());
    } else {
      // Note: Authorization code is commented out in original - keeping as is
      // const productOwnership = await Product.find({
      //   _id: { $in: products },
      //   sellerId
      // }, { _id: 1 });

      // if (productOwnership.length === 0) {
      //   throw buildErrorObject(httpStatus.FORBIDDEN, 'Access denied. You can only access analytics for your own products.');
      // }

      // const foundProductIds = productOwnership.map(p => p._id.toString());
      // const unauthorizedProducts = products.filter(id => !foundProductIds.includes(id));

      // if (unauthorizedProducts.length > 0) {
      //   throw buildErrorObject(httpStatus.FORBIDDEN, `Access denied. You don't own these products: ${unauthorizedProducts.join(', ')}`);
      // }

      verifiedProductIds = products;
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

    // Generate time periods and overview stats
    const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
    const overviewStats = getOverviewStats(fromDate, endDate, granularity);

    // Enhanced response with time period information
    const enhancedResponse = {
      ...analyticsData,
      timePeriods,
      overview: {
        ...overviewStats,
        productsAnalyzed: verifiedProductIds.length,
        dataType: type
      }
    };

    res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, enhancedResponse)
    );

  } catch (err) {
    handleError(res, err);
  }
};
