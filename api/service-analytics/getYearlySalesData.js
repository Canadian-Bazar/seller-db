import { ServiceYearlyAnalytics } from '../models/service-analytics.schema.js';
import moment from 'moment';

const getYearlySalesData = async (serviceIds, fromDate, toDate, type = 'salesCount') => {
  // Validate type parameter
  const validTypes = ['salesCount', 'salesAmount', 'profit', 'avgRating', 'completionRate'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const x = []; // Year labels
  const y = []; // Values based on type

  // Generate year range
  const yearRange = [];
  let current = fromDate.clone().startOf('year');
  while (current <= toDate.clone().endOf('year')) {
    yearRange.push({
      year: current.year(),
      label: current.format('YYYY')
    });
    current.add(1, 'year');
  }

  // Query yearly analytics documents
  const yearsToQuery = yearRange.map(y => y.year);
  const query = { year: { $in: yearsToQuery } };

  if (serviceIds && serviceIds.length > 0) {
    query.serviceId = { $in: serviceIds };
  }

  const yearlyDocs = await ServiceYearlyAnalytics.find(query);

  // Extract yearly data
  for (const yearInfo of yearRange) {
    let totalValue = 0;

    // Find docs for this year
    const relevantDocs = yearlyDocs.filter(doc => doc.year === yearInfo.year);

    for (const doc of relevantDocs) {
      // Use yearly totals if available
      if (doc.yearlyTotals && doc.yearlyTotals[type] !== undefined) {
        totalValue += doc.yearlyTotals[type] || 0;
      } else {
        // Fallback to summing monthly data
        if (doc.monthlyMetrics && doc.monthlyMetrics.length > 0) {
          for (const monthData of doc.monthlyMetrics) {
            if (monthData && monthData[type] !== undefined) {
              totalValue += monthData[type] || 0;
            }
          }
        }
      }
    }

    x.push(yearInfo.label);
    y.push(totalValue);
  }

  return { x, y };
};

export default getYearlySalesData;