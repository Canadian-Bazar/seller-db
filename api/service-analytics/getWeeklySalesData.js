import { ServiceMonthlyAnalytics } from '../models/service-analytics.schema.js';
import moment from 'moment';

const getWeeklySalesData = async (serviceIds, fromDate, toDate, type = 'salesCount') => {
  // Validate type parameter
  const validTypes = ['salesCount', 'salesAmount', 'profit', 'avgRating', 'completionRate'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const x = []; // Week labels
  const y = []; // Values based on type

  // Generate week range
  const weekRange = [];
  let current = fromDate.clone().startOf('week');
  while (current <= toDate.clone().endOf('week')) {
    const weekEnd = current.clone().endOf('week');
    weekRange.push({
      week: current.week(),
      year: current.year(),
      month: current.month() + 1,
      label: `Week ${current.week()}`,
      startDate: current.format('YYYY-MM-DD'),
      endDate: weekEnd.format('YYYY-MM-DD')
    });
    current.add(1, 'week');
  }

  // Get all unique year-month combinations that overlap with our weeks
  const yearMonths = new Set();
  weekRange.forEach(week => {
    const weekStart = moment(week.startDate);
    const weekEnd = moment(week.endDate);
    
    let current = weekStart.clone().startOf('month');
    while (current <= weekEnd.clone().endOf('month')) {
      yearMonths.add(`${current.year()}-${current.month() + 1}`);
      current.add(1, 'month');
    }
  });

  const query = {
    $or: Array.from(yearMonths).map(ym => {
      const [year, month] = ym.split('-').map(Number);
      return { year, month };
    })
  };

  if (serviceIds && serviceIds.length > 0) {
    query.serviceId = { $in: serviceIds };
  }

  const monthlyDocs = await ServiceMonthlyAnalytics.find(query);

  // Extract weekly data
  for (const weekInfo of weekRange) {
    let totalValue = 0;

    // Find docs that might contain this week's data
    const relevantDocs = monthlyDocs.filter(doc => {
      const docMonth = moment({ year: doc.year, month: doc.month - 1 });
      const weekStart = moment(weekInfo.startDate);
      const weekEnd = moment(weekInfo.endDate);
      
      return (
        docMonth.isSameOrBefore(weekEnd, 'month') && 
        docMonth.isSameOrAfter(weekStart, 'month')
      );
    });

    for (const doc of relevantDocs) {
      // Look for weekly data first
      if (doc.weeklyMetrics && doc.weeklyMetrics.length > 0) {
        const weeklyData = doc.weeklyMetrics.find(w => w.week === weekInfo.week);
        if (weeklyData && weeklyData[type] !== undefined) {
          totalValue += weeklyData[type] || 0;
          continue; // Found weekly data, skip daily aggregation for this doc
        }
      }

      // Fallback to daily data aggregation
      if (doc.dailyMetrics && doc.dailyMetrics.length > 0) {
        const weekStart = moment(weekInfo.startDate);
        const weekEnd = moment(weekInfo.endDate);
        const docMonth = moment({ year: doc.year, month: doc.month - 1 });

        for (const dailyData of doc.dailyMetrics) {
          if (dailyData && dailyData.day && dailyData[type] !== undefined) {
            const dayDate = moment({ 
              year: doc.year, 
              month: doc.month - 1, 
              date: dailyData.day 
            });
            
            if (dayDate.isBetween(weekStart, weekEnd, 'day', '[]')) {
              totalValue += dailyData[type] || 0;
            }
          }
        }
      }
    }

    x.push(weekInfo.label);
    y.push(totalValue);
  }

  return { x, y };
};

export default getWeeklySalesData;