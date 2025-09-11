import { ServiceMonthlyAnalytics , ServiceYearlyAnalytics } from "../models/service-analytics.schema.js";
import moment from "moment";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData } from 'express-validator';
import httpStatus from 'http-status'
import buildErrorObject from "../utils/buildErrorObject.js";
import getDailySalesData from "../service-analytics/getDailySalesData.js";
import getWeeklySalesData from "../service-analytics/getWeeklySalesData.js";
import getMonthlySalesData from "../service-analytics/getMonthlySalesData.js";
import getYearlySalesData from "../service-analytics/getYearlySalesData.js";
import Service from "../models/service.schema.js";

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

export const getServiceAnalytics = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { services, from, to, granularity, type = 'salesCount' } = validatedData;

    const fromDate = moment(from);
    const endDate = moment(to);

    if (!fromDate.isValid() || !endDate.isValid()) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid date format. Please use a valid date format.');
    }

    if (fromDate.isAfter(endDate)) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'From date cannot be after end date.');
    }

    const sellerId = req.user._id;
    let verifiedServiceIds = [];

    if (!services || services.length === 0) {
      const sellerServices = await Service.find({ sellerId }, { _id: 1 });

      if (sellerServices.length === 0) {
        const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
        const overviewStats = getOverviewStats(fromDate, endDate, granularity);
        
        return res.status(httpStatus.OK).json(
          buildResponse(httpStatus.OK, { 
            x: [], 
            y: [],
            timePeriods,
            overview: overviewStats,
            servicesAnalyzed: 0
          })
        );
      }

      verifiedServiceIds = sellerServices.map(service => service._id.toString());
    } else {
      verifiedServiceIds = services;
    }

    let analyticsData;

    switch (granularity) {
      case 'days':
        analyticsData = await getDailySalesData(verifiedServiceIds, fromDate, endDate, type);
        break;
      case 'weeks':
        analyticsData = await getWeeklySalesData(verifiedServiceIds, fromDate, endDate, type);
        break;
      case 'months':
        analyticsData = await getMonthlySalesData(verifiedServiceIds, fromDate, endDate, type);
        break;
      case 'years':
        analyticsData = await getYearlySalesData(verifiedServiceIds, fromDate, endDate, type);
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
        servicesAnalyzed: verifiedServiceIds?.length || 0,
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

export const getServiceAnalyticsSummary = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { services, from, to, granularity = 'months' } = validatedData;

    const fromDate = moment(from);
    const endDate = moment(to);

    if (!fromDate.isValid() || !endDate.isValid()) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid date format. Please use a valid date format.');
    }

    if (fromDate.isAfter(endDate)) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'From date cannot be after end date.');
    }

    const sellerId = req.user._id;
    let verifiedServiceIds = [];

    if (!services || services.length === 0) {
      const sellerServices = await Service.find({ sellerId }, { _id: 1 });

      if (sellerServices.length === 0) {
        const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
        const overviewStats = getOverviewStats(fromDate, endDate, granularity);
        
        return res.status(httpStatus.OK).json(
          buildResponse(httpStatus.OK, {
            totalSalesCount: 0,
            totalSalesAmount: 0,
            totalProfit: 0,
            averageRating: 0,
            averageCompletionRate: 0,
            averageSalesAmount: 0,
            servicesAnalyzed: 0,
            dateRange: {
              from: fromDate.format('YYYY-MM-DD'),
              to: endDate.format('YYYY-MM-DD')
            },
            timePeriods,
            overview: overviewStats
          })
        );
      }

      verifiedServiceIds = sellerServices.map(service => service._id.toString());
    } else {
      verifiedServiceIds = services;
    }

    // Get the date range and determine which collections to query
    const startYear = fromDate.year();
    const endYear = endDate.year();
    const startMonth = fromDate.month() + 1;
    const endMonth = endDate.month() + 1;

    // Build query for monthly analytics data
    const monthlyQuery = {
      serviceId: { $in: verifiedServiceIds.map(id => id) },
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

    // Query monthly analytics documents
    const monthlyDocs = await ServiceMonthlyAnalytics.find(monthlyQuery);

    // Initialize totals
    let totalSalesCount = 0;
    let totalSalesAmount = 0;
    let totalProfit = 0;
    let totalRating = 0;
    let totalCompletionRate = 0;
    let ratedServicesCount = 0;

    // Process documents and filter by exact date range if needed
    const processedPeriods = [];
    for (const doc of monthlyDocs) {
      const docDate = moment({ year: doc.year, month: doc.month - 1 });
      
      // Check if this month falls within our date range
      if (docDate.isBetween(fromDate.startOf('month'), endDate.endOf('month'), null, '[]')) {
        // Use monthly totals directly for simplicity and reliability
        if (doc.monthlyTotals) {
          totalSalesCount += doc.monthlyTotals.salesCount || 0;
          totalSalesAmount += doc.monthlyTotals.salesAmount || 0;
          totalProfit += doc.monthlyTotals.profit || 0;
          
          if (doc.monthlyTotals.avgRating > 0) {
            totalRating += doc.monthlyTotals.avgRating;
            ratedServicesCount++;
          }
          
          totalCompletionRate += doc.monthlyTotals.completionRate || 0;
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
    const averageRating = ratedServicesCount > 0 ? (totalRating / ratedServicesCount).toFixed(2) : 0;
    const averageCompletionRate = processedPeriods.length > 0 ? (totalCompletionRate / processedPeriods.length).toFixed(2) : 0;
    const averageSalesAmount = totalSalesCount > 0 ? (totalSalesAmount / totalSalesCount).toFixed(2) : 0;

    // Generate time periods and overview stats
    const timePeriods = generateTimePeriods(fromDate, endDate, granularity);
    const overviewStats = getOverviewStats(fromDate, endDate, granularity);

    // Build comprehensive summary response
    const summary = {
      // Core metrics
      totalSalesCount,
      totalSalesAmount: parseFloat(totalSalesAmount.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      averageRating: parseFloat(averageRating),
      averageCompletionRate: parseFloat(averageCompletionRate),
      averageSalesAmount: parseFloat(averageSalesAmount),
      
      // Meta information
      servicesAnalyzed: verifiedServiceIds.length,
      dateRange: {
        from: fromDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD'),
        totalDays: endDate.diff(fromDate, 'days') + 1
      },
      
      // Additional insights
      performanceMetrics: {
        salesPerDay: totalSalesCount > 0 ? (totalSalesCount / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
        revenuePerDay: totalSalesAmount > 0 ? (totalSalesAmount / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
        avgSalesPerService: verifiedServiceIds.length > 0 ? (totalSalesCount / verifiedServiceIds.length).toFixed(2) : 0,
        avgRevenuePerService: verifiedServiceIds.length > 0 ? (totalSalesAmount / verifiedServiceIds.length).toFixed(2) : 0,
        profitMargin: totalSalesAmount > 0 ? ((totalProfit / totalSalesAmount) * 100).toFixed(2) : 0
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