import { ServiceMonthlyPerformance, ServiceYearlyPerformance } from "../models/service-performance-analytics.schema.js";
import moment from "moment";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import buildErrorObject from "../utils/buildErrorObject.js";
import getDailyPerformanceData from "../service-performance-analytics/getDailyPerformanceData.js";
import getWeeklyPerformanceData from "../service-performance-analytics/getWeeklyPerformanceData.js";
import getMonthlyPerformanceData from "../service-performance-analytics/getMonthlyPerformanceData.js";
import getYearlyPerformanceData from "../service-performance-analytics/getYearlyPerformanceData.js";
import Services from "../models/service.schema.js";

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

export const getServicePerformanceAnalytics = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { services, from, to, granularity, type = 'viewCount' } = validatedData;

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
      const sellerServices = await Services.find({ sellerId }, { _id: 1 });

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

    let performanceData;

    switch (granularity) {
      case 'days':
        performanceData = await getDailyPerformanceData(verifiedServiceIds, fromDate, endDate, type);
        break;
      case 'weeks':
        performanceData = await getWeeklyPerformanceData(verifiedServiceIds, fromDate, endDate, type);
        break;
      case 'months':
        performanceData = await getMonthlyPerformanceData(verifiedServiceIds, fromDate, endDate, type);
        break;
      case 'years':
        performanceData = await getYearlyPerformanceData(verifiedServiceIds, fromDate, endDate, type);
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

export const getServicePerformanceSummary = async (req, res) => {
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
      const sellerServices = await Services.find({ sellerId }, { _id: 1 });

      if (sellerServices.length === 0) {
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
            averageResponseTime: 0,
            averagePopularityScore: 0,
            quotationToViewRatio: 0,
            acceptanceRate: 0,
            rejectionRate: 0,
            inProgressRate: 0,
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

    // Build query for monthly performance data
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

    // Query monthly performance documents
    const monthlyDocs = await ServiceMonthlyPerformance.find(monthlyQuery);

    // Initialize totals
    let totalViews = 0;
    let totalQuotationsSent = 0;
    let totalQuotationsAccepted = 0;
    let totalQuotationsRejected = 0;
    let totalQuotationsInProgress = 0;
    let totalPopularityScore = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

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
          
          if (doc.monthlyTotals.responseTime > 0) {
            totalResponseTime += doc.monthlyTotals.responseTime;
            responseTimeCount++;
          }
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
    
    const averagePopularityScore = verifiedServiceIds.length > 0 ? (totalPopularityScore / verifiedServiceIds.length).toFixed(2) : 0;
    const averageResponseTime = responseTimeCount > 0 ? (totalResponseTime / responseTimeCount).toFixed(2) : 0;

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
      averageResponseTime: parseFloat(averageResponseTime),
      
      // Average metrics
      averagePopularityScore: parseFloat(averagePopularityScore),
      
      // Calculated rates
      quotationToViewRatio: parseFloat(quotationToViewRatio),
      acceptanceRate: parseFloat(acceptanceRate),
      rejectionRate: parseFloat(rejectionRate),
      inProgressRate: parseFloat(inProgressRate),
      
      // Meta information
      servicesAnalyzed: verifiedServiceIds.length,
      dateRange: {
        from: fromDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD'),
        totalDays: endDate.diff(fromDate, 'days') + 1
      },
      
      // Additional insights
      engagementMetrics: {
        viewsPerDay: totalViews > 0 ? (totalViews / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
        quotationsPerDay: totalQuotationsSent > 0 ? (totalQuotationsSent / (endDate.diff(fromDate, 'days') + 1)).toFixed(2) : 0,
        avgViewsPerService: verifiedServiceIds.length > 0 ? (totalViews / verifiedServiceIds.length).toFixed(2) : 0,
        avgQuotationsPerService: verifiedServiceIds.length > 0 ? (totalQuotationsSent / verifiedServiceIds.length).toFixed(2) : 0,
        conversionRate: totalViews > 0 ? ((totalQuotationsAccepted / totalViews) * 100).toFixed(2) : 0
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