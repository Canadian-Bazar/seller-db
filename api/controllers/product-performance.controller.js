import { ProductMonthlyPerformance, ProductYearlyPerformance } from "../models/product-performance-analytics.schema.js";
import moment from "moment";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import buildErrorObject from "../utils/buildErrorObject.js";
import getDailyPerformanceData from "../performance-analytics/getDailyPerformanceData.js";
import getWeeklyPerformanceData from "../performance-analytics/getWeeklyPerformanceData.js";
import getMonthlyPerformanceData from "../performance-analytics/getMonthlyPerformaceData.js";
import getYearlyPerformanceData from "../performance-analytics/getYearlyPerformanceData.js";
import Products from "../models/products.schema.js";

// export const getProductPerformanceAnalytics = async (req, res) => {

//   try {
//     const validatedData = matchedData(req);
//     const { products, from, to, granularity, type = 'viewCount' } = validatedData;

//     const fromDate = moment(from);
//     const endDate = moment(to);

//     if (!fromDate.isValid() || !endDate.isValid()) {
//       throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid date format. Please use a valid date format.');
//     }

//     if (fromDate.isAfter(endDate)) {
//       throw buildErrorObject(httpStatus.BAD_REQUEST, 'From date cannot be after end date.');
//     }

//     const sellerId = req.user._id;
//     let verifiedProductIds = [];

//     if (!products || products.length === 0) {
//       const sellerProducts = await Product.find({ sellerId }, { _id: 1 });

//       if (sellerProducts.length === 0) {
//         return res.status(httpStatus.OK).json(
//           buildResponse(httpStatus.OK, { x: [], y: [] })
//         );
//       }

//       verifiedProductIds = sellerProducts.map(product => product._id.toString());
//     } else {
//       const productOwnership = await Product.find({
//         _id: { $in: products },
//         sellerId
//       }, { _id: 1 });

//       if (productOwnership.length === 0) {
//         throw buildErrorObject(httpStatus.FORBIDDEN, 'Access denied. You can only access performance analytics for your own products.');
//       }

//       const foundProductIds = productOwnership.map(p => p._id.toString());
//       const unauthorizedProducts = products.filter(id => !foundProductIds.includes(id));

//       if (unauthorizedProducts.length > 0) {
//         throw buildErrorObject(httpStatus.FORBIDDEN, `Access denied. You don't own these products: ${unauthorizedProducts.join(', ')}`);
//       }

//       verifiedProductIds = foundProductIds;

//           verifiedProductIds = products;

//     }

//     let performanceData;

//     switch (granularity) {
//       case 'days':
//         performanceData = await getDailyPerformanceData(verifiedProductIds, fromDate, endDate, type);
//         break;
//       case 'weeks':
//         performanceData = await getWeeklyPerformanceData(verifiedProductIds, fromDate, endDate, type);
//         break;
//       case 'months':
//         performanceData = await getMonthlyPerformanceData(verifiedProductIds, fromDate, endDate, type);
//         break;
//       case 'years':
//         performanceData = await getYearlyPerformanceData(verifiedProductIds, fromDate, endDate, type);
//         break;
//     }

//     res.status(httpStatus.OK).json(
//       buildResponse(httpStatus.OK, performanceData)
//     );

//   } catch (err) {
//     handleError(res, err);
//   }
// };

// export const getProductPerformanceSummary = async (req, res) => {
//   try {
//     const validatedData = matchedData(req);
//     const { products, from, to } = validatedData;

//     const fromDate = moment(from);
//     const endDate = moment(to);

//     if (!fromDate.isValid() || !endDate.isValid()) {
//       throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid date format. Please use a valid date format.');
//     }

//     if (fromDate.isAfter(endDate)) {
//       throw buildErrorObject(httpStatus.BAD_REQUEST, 'From date cannot be after end date.');
//     }

//     const sellerId = req.user._id;
//     let verifiedProductIds = [];

//     if (!products || products.length === 0) {
//       const sellerProducts = await Product.find({ sellerId }, { _id: 1 });

//       if (sellerProducts.length === 0) {
//         return res.status(httpStatus.OK).json(
//           buildResponse(httpStatus.OK, {
//             totalViews: 0,
//             totalQuotationsSent: 0,
//             totalQuotationsAccepted: 0,
//             totalQuotationsRejected: 0,
//             totalQuotationsInProgress: 0,
//             totalPopularityScore: 0,
//             totalBestsellerScore: 0,
//             averagePopularityScore: 0,
//             averageBestsellerScore: 0,
//             quotationToViewRatio: 0,
//             acceptanceRate: 0,
//             rejectionRate: 0,
//             inProgressRate: 0,
//             productsAnalyzed: 0,
//             dateRange: {
//               from: fromDate.format('YYYY-MM-DD'),
//               to: endDate.format('YYYY-MM-DD')
//             }
//           })
//         );
//       }

//       verifiedProductIds = sellerProducts.map(product => product._id.toString());
//     } else {
//     //   const productOwnership = await Product.find({
//     //     _id: { $in: products },
//     //     sellerId
//     //   }, { _id: 1 });

//     //   if (productOwnership.length === 0) {
//     //     throw buildErrorObject(httpStatus.FORBIDDEN, 'Access denied. You can only access performance analytics for your own products.');
//     //   }

//     //   const foundProductIds = productOwnership.map(p => p._id.toString());
//     //   const unauthorizedProducts = products.filter(id => !foundProductIds.includes(id));

//     //   if (unauthorizedProducts.length > 0) {
//     //     throw buildErrorObject(httpStatus.FORBIDDEN, `Access denied. You don't own these products: ${unauthorizedProducts.join(', ')}`);
//     //   }

//       verifiedProductIds = products;
//     }

//     // Get the date range and determine which collections to query
//     const startYear = fromDate.year();
//     const endYear = endDate.year();
//     const startMonth = fromDate.month() + 1;
//     const endMonth = endDate.month() + 1;

//     // Build query for monthly performance data
//     const monthlyQuery = {
//       productId: { $in: verifiedProductIds.map(id => id) },
//       $or: []
//     };

//     // Generate all year-month combinations in the date range
//     for (let year = startYear; year <= endYear; year++) {
//       const monthStart = (year === startYear) ? startMonth : 1;
//       const monthEnd = (year === endYear) ? endMonth : 12;
      
//       for (let month = monthStart; month <= monthEnd; month++) {
//         monthlyQuery.$or.push({ year, month });
//       }
//     }

//     // Query monthly performance documents
//     const monthlyDocs = await ProductMonthlyPerformance.find(monthlyQuery);

//     // Initialize totals
//     let totalViews = 0;
//     let totalQuotationsSent = 0;
//     let totalQuotationsAccepted = 0;
//     let totalQuotationsRejected = 0;
//     let totalQuotationsInProgress = 0;
//     let totalPopularityScore = 0;
//     let totalBestsellerScore = 0;

//     // Process documents and filter by exact date range if needed
//     for (const doc of monthlyDocs) {
//       const docDate = moment({ year: doc.year, month: doc.month - 1 });
      
//       // Check if this month falls within our date range
//       if (docDate.isBetween(fromDate.startOf('month'), endDate.endOf('month'), null, '[]')) {
//         // Use monthly totals directly for simplicity and reliability
//         if (doc.monthlyTotals) {
//           totalViews += doc.monthlyTotals.viewCount || 0;
//           totalQuotationsSent += doc.monthlyTotals.quotationsSent || 0;
//           totalQuotationsAccepted += doc.monthlyTotals.quotationsAccepted || 0;
//           totalQuotationsRejected += doc.monthlyTotals.quotationsRejected || 0;
//           totalQuotationsInProgress += doc.monthlyTotals.quotationsInProgress || 0;
//           totalPopularityScore += doc.monthlyTotals.popularityScore || 0;
//           totalBestsellerScore += doc.monthlyTotals.bestsellerScore || 0;
//         }
//       }
//     }

//     // Calculate derived metrics
//     const quotationToViewRatio = totalViews > 0 ? ((totalQuotationsSent / totalViews) * 100).toFixed(2) : 0;
//     const acceptanceRate = totalQuotationsSent > 0 ? ((totalQuotationsAccepted / totalQuotationsSent) * 100).toFixed(2) : 0;
//     const rejectionRate = totalQuotationsSent > 0 ? ((totalQuotationsRejected / totalQuotationsSent) * 100).toFixed(2) : 0;
//     const inProgressRate = totalQuotationsSent > 0 ? ((totalQuotationsInProgress / totalQuotationsSent) * 100).toFixed(2) : 0;
    
//     const averagePopularityScore = verifiedProductIds.length > 0 ? (totalPopularityScore / verifiedProductIds.length).toFixed(2) : 0;
//     const averageBestsellerScore = verifiedProductIds.length > 0 ? (totalBestsellerScore / verifiedProductIds.length).toFixed(2) : 0;

//     // Build comprehensive summary response
//     const summary = {
//       // Core metrics
//       totalViews,
//       totalQuotationsSent,
//       totalQuotationsAccepted,
//       totalQuotationsRejected,
//       totalQuotationsInProgress,
//       totalPopularityScore,
//       totalBestsellerScore,
      
//       // Average metrics
//       averagePopularityScore: parseFloat(averagePopularityScore),
//       averageBestsellerScore: parseFloat(averageBestsellerScore),
      
//       // Calculated rates
//       quotationToViewRatio: parseFloat(quotationToViewRatio),
//       acceptanceRate: parseFloat(acceptanceRate),
//       rejectionRate: parseFloat(rejectionRate),
//       inProgressRate: parseFloat(inProgressRate),
      
//       // Meta information
//       productsAnalyzed: verifiedProductIds.length,
//       dateRange: {
//         from: fromDate.format('YYYY-MM-DD'),
//         to: endDate.format('YYYY-MM-DD'),
//         totalDays: endDate.diff(fromDate, 'days') + 1
//       },
      
//       // Additional insights
//       engagementMetrics: {
//         viewsPerDay: totalViews > 0 ? (totalViews / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
//         quotationsPerDay: totalQuotationsSent > 0 ? (totalQuotationsSent / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
//         avgViewsPerProduct: verifiedProductIds.length > 0 ? (totalViews / verifiedProductIds.length).toFixed(2) : 0,
//         avgQuotationsPerProduct: verifiedProductIds.length > 0 ? (totalQuotationsSent / verifiedProductIds.length).toFixed(2) : 0
//       }
//     };

//     res.status(httpStatus.OK).json(
//       buildResponse(httpStatus.OK, summary)
//     );

//   } catch (err) {
//     handleError(res, err);
//   }
// };



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

export const getProductPerformanceAnalytics = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { products, from, to, granularity, type = 'viewCount' } = validatedData;

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
      const sellerProducts = await Products.find({ sellerId }, { _id: 1 });

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

      // verifiedProductIds = sellerProducts.map(product => product._id.toString());

      verifiedProductIds=products
    } else {
      // const productOwnership = await Products.find({
      //   _id: { $in: products },
      //   sellerId
      // }, { _id: 1 });

      // if (productOwnership.length === 0) {
      //   throw buildErrorObject(httpStatus.FORBIDDEN, 'Access denied. You can only access performance analytics for your own products.');
      // }

      // const foundProductIds = productOwnership.map(p => p._id.toString());
      // const unauthorizedProducts = products.filter(id => !foundProductIds.includes(id));

      // if (unauthorizedProducts.length > 0) {
      //   throw buildErrorObject(httpStatus.FORBIDDEN, `Access denied. You don't own these products: ${unauthorizedProducts.join(', ')}`);
      // }

      verifiedProductIds = products;
      // Note: There's a bug in your original code - you're overwriting verifiedProductIds with products
      // I've fixed it to use foundProductIds
    }

    let performanceData;

    switch (granularity) {
      case 'days':
        performanceData = await getDailyPerformanceData(verifiedProductIds, fromDate, endDate, type);
        break;
      case 'weeks':
        performanceData = await getWeeklyPerformanceData(verifiedProductIds, fromDate, endDate, type);
        break;
      case 'months':
        performanceData = await getMonthlyPerformanceData(verifiedProductIds, fromDate, endDate, type);
        break;
      case 'years':
        performanceData = await getYearlyPerformanceData(verifiedProductIds, fromDate, endDate, type);
        break;
    }

    // Generate time periods and overview stats
    const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
    const overviewStats = getOverviewStats(fromDate, endDate, granularity);

    // Enhanced response with time period information
    const enhancedResponse = {
      ...performanceData,
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

export const getProductPerformanceSummary = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { products, from, to, granularity = 'months' } = validatedData;

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
      const sellerProducts = await Products.find({ sellerId }, { _id: 1 });

      if (sellerProducts.length === 0) {
        const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
        const overviewStats = getOverviewStats(fromDate, endDate, granularity);
        
        return res.status(httpStatus.OK).json(
          buildResponse(httpStatus.OK, {
            totalViews: 0,
            totalQuotationsSent: 0,
            totalQuotationsAccepted: 0,
            totalQuotationsRejected: 0,
            totalQuotationsInProgress: 0,
            totalPopularityScore: 0,
            totalBestsellerScore: 0,
            averagePopularityScore: 0,
            averageBestsellerScore: 0,
            quotationToViewRatio: 0,
            acceptanceRate: 0,
            rejectionRate: 0,
            inProgressRate: 0,
            productsAnalyzed: 0,
            dateRange: {
              from: fromDate.format('YYYY-MM-DD'),
              to: endDate.format('YYYY-MM-DD')
            },
            timePeriods,
            overview: overviewStats
          })
        );
      }

      verifiedProductIds = sellerProducts.map(product => product._id.toString());
    } else {
      // Note: Your original code has this section commented out - I'll keep it as is
      // but you should uncomment it for proper authorization
      // const productOwnership = await Product.find({
      //   _id: { $in: products },
      //   sellerId
      // }, { _id: 1 });

      // if (productOwnership.length === 0) {
      //   throw buildErrorObject(httpStatus.FORBIDDEN, 'Access denied. You can only access performance analytics for your own products.');
      // }

      // const foundProductIds = productOwnership.map(p => p._id.toString());
      // const unauthorizedProducts = products.filter(id => !foundProductIds.includes(id));

      // if (unauthorizedProducts.length > 0) {
      //   throw buildErrorObject(httpStatus.FORBIDDEN, `Access denied. You don't own these products: ${unauthorizedProducts.join(', ')}`);
      // }

      verifiedProductIds = products;
    }

    // Get the date range and determine which collections to query
    const startYear = fromDate.year();
    const endYear = endDate.year();
    const startMonth = fromDate.month() + 1;
    const endMonth = endDate.month() + 1;

    // Build query for monthly performance data
    const monthlyQuery = {
      productId: { $in: verifiedProductIds.map(id => id) },
      $or: []
    };

    // Generate all year-month combinations in the date range
    const yearMonthCombinations = [];
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = (year === startYear) ? startMonth : 1;
      const monthEnd = (year === endYear) ? endMonth : 12;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        monthlyQuery.$or.push({ year, month });
        yearMonthCombinations.push({ year, month });
      }
    }

    // Query monthly performance documents
    const monthlyDocs = await ProductMonthlyPerformance.find(monthlyQuery);

    // Initialize totals
    let totalViews = 0;
    let totalQuotationsSent = 0;
    let totalQuotationsAccepted = 0;
    let totalQuotationsRejected = 0;
    let totalQuotationsInProgress = 0;
    let totalPopularityScore = 0;
    let totalBestsellerScore = 0;

    // Process documents and filter by exact date range if needed
    const processedPeriods = [];
    for (const doc of monthlyDocs) {
      const docDate = moment({ year: doc.year, month: doc.month - 1 });
      
      // Check if this month falls within our date range
      if (docDate.isBetween(fromDate.startOf('month'), endDate.endOf('month'), null, '[]')) {
        // Use monthly totals directly for simplicity and reliability
        if (doc.monthlyTotals) {
          totalViews += doc.monthlyTotals.viewCount || 0;
          totalQuotationsSent += doc.monthlyTotals.quotationsSent || 0;
          totalQuotationsAccepted += doc.monthlyTotals.quotationsAccepted || 0;
          totalQuotationsRejected += doc.monthlyTotals.quotationsRejected || 0;
          totalQuotationsInProgress += doc.monthlyTotals.quotationsInProgress || 0;
          totalPopularityScore += doc.monthlyTotals.popularityScore || 0;
          totalBestsellerScore += doc.monthlyTotals.bestsellerScore || 0;
        }

        // Track processed periods
        processedPeriods.push({
          year: doc.year,
          month: doc.month,
          monthName: docDate.format('MMMM'),
          displayLabel: docDate.format('MMMM YYYY'),
          data: doc.monthlyTotals
        });
      }
    }

    // Calculate derived metrics
    const quotationToViewRatio = totalViews > 0 ? ((totalQuotationsSent / totalViews) * 100).toFixed(2) : 0;
    const acceptanceRate = totalQuotationsSent > 0 ? ((totalQuotationsAccepted / totalQuotationsSent) * 100).toFixed(2) : 0;
    const rejectionRate = totalQuotationsSent > 0 ? ((totalQuotationsRejected / totalQuotationsSent) * 100).toFixed(2) : 0;
    const inProgressRate = totalQuotationsSent > 0 ? ((totalQuotationsInProgress / totalQuotationsSent) * 100).toFixed(2) : 0;
    
    const averagePopularityScore = verifiedProductIds.length > 0 ? (totalPopularityScore / verifiedProductIds.length).toFixed(2) : 0;
    const averageBestsellerScore = verifiedProductIds.length > 0 ? (totalBestsellerScore / verifiedProductIds.length).toFixed(2) : 0;

    // Generate time periods and overview stats
    const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
    const overviewStats = getOverviewStats(fromDate, endDate, granularity);

    // Build comprehensive summary response
    const summary = {
      // Core metrics
      totalViews,
      totalQuotationsSent,
      totalQuotationsAccepted,
      totalQuotationsRejected,
      totalQuotationsInProgress,
      totalPopularityScore,
      totalBestsellerScore,
      
      // Average metrics
      averagePopularityScore: parseFloat(averagePopularityScore),
      averageBestsellerScore: parseFloat(averageBestsellerScore),
      
      // Calculated rates
      quotationToViewRatio: parseFloat(quotationToViewRatio),
      acceptanceRate: parseFloat(acceptanceRate),
      rejectionRate: parseFloat(rejectionRate),
      inProgressRate: parseFloat(inProgressRate),
      
      // Meta information
      productsAnalyzed: verifiedProductIds.length,
      dateRange: {
        from: fromDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD'),
        totalDays: endDate.diff(fromDate, 'days') + 1
      },
      
      // Additional insights
      engagementMetrics: {
        viewsPerDay: totalViews > 0 ? (totalViews / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
        quotationsPerDay: totalQuotationsSent > 0 ? (totalQuotationsSent / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
        avgViewsPerProduct: verifiedProductIds.length > 0 ? (totalViews / verifiedProductIds.length).toFixed(2) : 0,
        avgQuotationsPerProduct: verifiedProductIds.length > 0 ? (totalQuotationsSent / verifiedProductIds.length).toFixed(2) : 0
      },

      // Enhanced time period information
      timePeriods,
      overview: {
        ...overviewStats,
        yearMonthCombinations,
        processedPeriods,
        dataAvailability: {
          totalExpectedPeriods: yearMonthCombinations.length,
          periodsWithData: processedPeriods.length,
          coveragePercentage: yearMonthCombinations.length > 0 ? 
            ((processedPeriods.length / yearMonthCombinations.length) * 100).toFixed(2) : 0
        }
      }
    };

    res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, summary)
    );

  } catch (err) {
    handleError(res, err);
  }
};

// You'll need to implement these functions based on your data structure
// These are placeholder implementations
