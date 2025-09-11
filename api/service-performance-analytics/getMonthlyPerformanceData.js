import { ServiceMonthlyPerformance, ServiceYearlyPerformance } from '../models/service-performance-analytics.schema.js';
import moment from 'moment';


export const getMonthlyPerformanceData = async (serviceIds, fromDate, toDate, type = 'viewCount') => {
 

  // Validate type parameter
  const validTypes = ['viewCount', 'quotationsSent', 'quotationsAccepted', 'quotationsRejected', 'quotationsInProgress', 'popularityScore', 'responseTime'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const x = []; // Month labels
  const y = []; // Values based on type

  // Generate month range
  const monthRange = [];
  let current = fromDate.clone().startOf('month');
  while (current <= toDate.clone().endOf('month')) {
    monthRange.push({
      year: current.year(),
      month: current.month() + 1,
      label: current.format('MMMM') // January, February, etc.
    });
    current.add(1, 'month');
  }

  // Query yearly performance documents
  const yearsToQuery = [...new Set(monthRange.map(m => m.year))];
  const query = { year: { $in: yearsToQuery } };

  if (serviceIds && serviceIds.length > 0) {
    query.serviceId = { $in: serviceIds };
  }

  const yearlyDocs = await ServiceYearlyPerformance.find(query);

  // Extract monthly data
  for (const monthInfo of monthRange) {
    let totalValue = 0;

    // Find docs for this year
    const relevantDocs = yearlyDocs.filter(doc => doc.year === monthInfo.year);

    for (const doc of relevantDocs) {
      
      
      // Find the month data (handle both correct and nested structures)
      let monthMetric = null;
      
      if (doc.monthlyMetrics && doc.monthlyMetrics.length > 0) {
        // Try expected index first
        const expectedIndex = monthInfo.month - 1;
        if (doc.monthlyMetrics[expectedIndex] && doc.monthlyMetrics[expectedIndex].month === monthInfo.month) {
          monthMetric = doc.monthlyMetrics[expectedIndex];
        } else {
          // Search through array for matching month
          monthMetric = doc.monthlyMetrics.find(metric => {
            if (metric && metric.month === monthInfo.month) {
              return metric;
            }
            // Handle nested structure like { '5': { month: 6, ... } }
            if (metric && typeof metric === 'object') {
              for (const key in metric) {
                if (metric[key] && metric[key].month === monthInfo.month) {
                  return metric[key];
                }
              }
            }
            return null;
          });
          
          // If found nested, extract the actual data
          if (monthMetric && !monthMetric.month) {
            for (const key in monthMetric) {
              if (monthMetric[key] && monthMetric[key].month === monthInfo.month) {
                monthMetric = monthMetric[key];
                break;
              }
            }
          }
        }
      }
      
      
      if (monthMetric && monthMetric[type] !== undefined) {
        totalValue += monthMetric[type] || 0; // Use dynamic type
      }
    }

    x.push(monthInfo.label);
    y.push(totalValue);
  }

  return { x, y };
};


export default getMonthlyPerformanceData;