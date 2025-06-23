



import { ProductMonthlyPerformance, ProductYearlyPerformance } from '../models/product-performance-analytics.schema.js';
import moment from 'moment';

/**
 * Get daily performance data for specified date range
 * @param {Array} productIds - Array of product IDs to filter by
 * @param {moment.Moment} fromDate - Start date
 * @param {moment.Moment} toDate - End date
 * @param {string} type - Type of data to return (viewCount, quotationsSent, quotationsAccepted, quotationsRejected, quotationsInProgress, popularityScore, bestsellerScore)
 * @returns {Promise<{x: Array, y: Array}>}
 */
export const getDailyPerformanceData = async (productIds, fromDate, toDate, type = 'viewCount') => {
  console.log('📅 Getting daily performance data:', { 
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

  const x = []; // Day labels
  const y = []; // Values based on type

  // Generate all dates in range
  const dateRange = [];
  let current = fromDate.clone();
  while (current <= toDate) {
    dateRange.push(current.clone());
    current.add(1, 'day');
  }

  // Group dates by month to minimize database queries
  const monthsToQuery = [...new Set(dateRange.map(date => ({
    year: date.year(),
    month: date.month() + 1
  })))];

  // Query monthly performance documents
  const query = {
    $or: monthsToQuery.map(({ year, month }) => ({ year, month }))
  };

  // Filter by products if specified
  if (productIds && productIds.length > 0) {
    query.productId = { $in: productIds };
  }

  const monthlyDocs = await ProductMonthlyPerformance.find(query);

  // Extract data for each date
  for (const date of dateRange) {
    const dayName = date.format('dddd'); // Monday, Tuesday, etc.
    const year = date.year();
    const month = date.month() + 1;
    const day = date.date();

    // Find relevant monthly documents for this date
    const relevantDocs = monthlyDocs.filter(doc => 
      doc.year === year && doc.month === month
    );

    // Sum the specified type across all matching products for this day
    let totalValue = 0;
    for (const doc of relevantDocs) {
      const dayMetric = doc.dailyMetrics[day - 1]; // day 1 = index 0
      if (dayMetric) {
        totalValue += dayMetric[type] || 0; // Use dynamic type
      }
    }

    x.push(dayName);
    y.push(totalValue);
  }

  console.log(`📊 Daily ${type} result:`, { x, y });
  return { x, y };
};


export default getDailyPerformanceData;
