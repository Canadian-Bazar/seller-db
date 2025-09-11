import { ServiceMonthlyPerformance } from '../models/service-performance-analytics.schema.js';
import moment from 'moment';

const getDailyPerformanceData = async (serviceIds, fromDate, toDate, type = 'viewCount') => {
  // Validate type parameter
  const validTypes = ['viewCount', 'quotationsSent', 'quotationsAccepted', 'quotationsRejected', 'quotationsInProgress', 'popularityScore', 'responseTime'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const x = []; // Day labels
  const y = []; // Values based on type

  // Generate date range
  const dateRange = [];
  let current = fromDate.clone();
  while (current <= toDate) {
    dateRange.push({
      date: current.format('YYYY-MM-DD'),
      year: current.year(),
      month: current.month() + 1,
      day: current.date(),
      label: current.format('MMM DD')
    });
    current.add(1, 'day');
  }

  // Get all unique year-month combinations
  const yearMonths = [...new Set(dateRange.map(d => `${d.year}-${d.month}`))];
  
  const query = {
    $or: yearMonths.map(ym => {
      const [year, month] = ym.split('-').map(Number);
      return { year, month };
    })
  };

  if (serviceIds && serviceIds.length > 0) {
    query.serviceId = { $in: serviceIds };
  }

  const monthlyDocs = await ServiceMonthlyPerformance.find(query);

  // Create a lookup map for quick access
  const dataLookup = {};
  monthlyDocs.forEach(doc => {
    const key = `${doc.year}-${doc.month}-${doc.serviceId}`;
    dataLookup[key] = doc;
  });

  // Extract daily data
  for (const dateInfo of dateRange) {
    let totalValue = 0;

    // If no service IDs specified, get all services for this date
    if (!serviceIds || serviceIds.length === 0) {
      const relevantDocs = monthlyDocs.filter(doc => 
        doc.year === dateInfo.year && doc.month === dateInfo.month
      );
      
      for (const doc of relevantDocs) {
        const dailyData = doc.dailyMetrics && doc.dailyMetrics[dateInfo.day - 1];
        if (dailyData && dailyData.day === dateInfo.day && dailyData[type] !== undefined) {
          totalValue += dailyData[type] || 0;
        }
      }
    } else {
      // Get data for specified services
      for (const serviceId of serviceIds) {
        const key = `${dateInfo.year}-${dateInfo.month}-${serviceId}`;
        const doc = dataLookup[key];
        
        if (doc && doc.dailyMetrics) {
          const dailyData = doc.dailyMetrics[dateInfo.day - 1];
          if (dailyData && dailyData.day === dateInfo.day && dailyData[type] !== undefined) {
            totalValue += dailyData[type] || 0;
          }
        }
      }
    }

    x.push(dateInfo.label);
    y.push(totalValue);
  }

  return { x, y };
};

export default getDailyPerformanceData;