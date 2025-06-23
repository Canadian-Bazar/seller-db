import { ProductMonthlyPerformance, ProductYearlyPerformance } from '../models/product-performance-analytics.schema.js';
import moment from 'moment';


/**
 * Get weekly performance data for specified date range
 * @param {Array} productIds - Array of product IDs to filter by
 * @param {moment.Moment} fromDate - Start date
 * @param {moment.Moment} toDate - End date
 * @param {string} type - Type of data to return
 * @returns {Promise<{x: Array, y: Array}>}
 */
export const getWeeklyPerformanceData = async (productIds, fromDate, toDate, type = 'viewCount') => {
  console.log('📅 Getting weekly performance data:', { 
    productIds, 
    fromDate: fromDate.format(), 
    toDate: toDate.format(), 
    type 
  });

  // Validate type parameter
  const validTypes = ['viewCount', 'quotationsSent', 'quotationsAccepted', 'quotationsRejected', 'quotationsInProgress', 'popularityScore', 'bestsellerScore'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const x = []; // Week labels
  const y = []; // Values based on type

  // Generate week range
  const weekRange = [];
  let current = fromDate.clone().startOf('week');
  while (current <= toDate.clone().endOf('week')) {
    weekRange.push({
      weekNumber: current.week(),
      year: current.year(),
      label: `Week ${current.week()}`
    });
    current.add(1, 'week');
  }

  // Get months that contain these weeks
  const monthsToQuery = [...new Set(weekRange.map(week => {
    const weekStart = moment().year(week.year).week(week.weekNumber).startOf('week');
    return {
      year: weekStart.year(),
      month: weekStart.month() + 1
    };
  }))];

  // Query monthly performance documents
  const query = {
    $or: monthsToQuery.map(({ year, month }) => ({ year, month }))
  };

  if (productIds && productIds.length > 0) {
    query.productId = { $in: productIds };
  }

  const monthlyDocs = await ProductMonthlyPerformance.find(query);

  // Extract weekly data
  for (const weekInfo of weekRange) {
    let totalValue = 0;

    // Find docs that contain this week
    for (const doc of monthlyDocs) {
      const weekMetric = doc.weeklyMetrics.find(w => w.week === weekInfo.weekNumber);
      if (weekMetric) {
        totalValue += weekMetric[type] || 0; // Use dynamic type
      }
    }

    x.push(weekInfo.label);
    y.push(totalValue);
  }

  console.log(`📊 Weekly ${type} result:`, { x, y });
  return { x, y };
};


export default getWeeklyPerformanceData;