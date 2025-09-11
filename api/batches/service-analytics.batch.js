import { 
  ServiceMonthlyAnalytics, 
  ServiceYearlyAnalytics 
} from '../models/service-analytics.schema.js';
import { 
  ServiceMonthlyPerformance, 
  ServiceYearlyPerformance 
} from '../models/service-performance-analytics.schema.js';
import moment from 'moment';
import ServiceActivityLog from '../models/service-activity.schema.js';

export async function trackServiceActivity(serviceId, activityType, data = {}) {
  try {
    const { redisClient, REDIS_KEYS } = await import('../redis.config.js');
    
    console.log('Tracking service activity:', { serviceId, activityType, data });
    
    const key = `${REDIS_KEYS.SERVICE_ACTIVITY || 'service_activity:'}${serviceId}`;
    
    // Track different activity types
    switch (activityType) {
      case 'viewed':
        await redisClient.hincrby(key, 'views', 1);
        break;
      case 'quote_requested':
        await redisClient.hincrby(key, 'quotesRequested', 1);
        break;
      case 'quote_sent':
        await redisClient.hincrby(key, 'quotesSent', 1);
        break;
      case 'quote_accepted':
        await redisClient.hincrby(key, 'quotesAccepted', 1);
        break;
      case 'quote_rejected':
        await redisClient.hincrby(key, 'quotesRejected', 1);
        break;
      case 'service_completed':
        await redisClient.hincrby(key, 'completed', 1);
        if (data.serviceAmount) {
          await redisClient.hincrbyfloat(key, 'totalSales', data.serviceAmount);
        }
        if (data.profit) {
          await redisClient.hincrbyfloat(key, 'totalProfit', data.profit);
        }
        break;
    }
    
    await redisClient.hset(key, 'lastInteracted', Date.now().toString());

    const ttl = await redisClient.ttl(key);
    if (ttl < 0) {
      await redisClient.expire(key, 30 * 24 * 60 * 60); // 30 days
    }

    // Log the activity
    await ServiceActivityLog.create({
      serviceId,
      sellerId: data.sellerId,
      buyerId: data.buyerId,
      activityType,
      serviceAmount: data.serviceAmount || 0,
      profit: data.profit || 0,
      rating: data.rating,
      responseTime: data.responseTime,
      quotationId: data.quotationId,
      orderId: data.orderId,
      reviewId: data.reviewId,
      timestamp: new Date(),
      metadata: data.metadata
    });

    console.log('Service activity tracked successfully');

  } catch (error) {
    console.error('Error tracking service activity:', {
      serviceId,
      activityType,
      data,
      error: error.message
    });
    throw error;
  }
}

export async function runDailyServiceSalesAggregation(targetDate = new Date()) {
  try {
    console.log('Starting daily service sales aggregation for:', targetDate);
    const startTime = Date.now();
    
    const dayStart = moment(targetDate).startOf('day').toDate();
    const dayEnd = moment(targetDate).endOf('day').toDate();
    const year = moment(targetDate).year();
    const month = moment(targetDate).month() + 1; // 1-12
    const day = moment(targetDate).date(); // 1-31
    const week = moment(targetDate).week(); // Week of year

    console.log('Processing date range:', { dayStart, dayEnd, year, month, day, week });

    // ONLY PROCESS SALES DATA (service_completed activities)
    const salesPipeline = [
      {
        $match: {
          timestamp: { $gte: dayStart, $lte: dayEnd },
          activityType: 'service_completed',
          isProcessed: false
        }
      },
      {
        $group: {
          _id: '$serviceId',
          salesCount: { $sum: 1 },
          totalSales: { $sum: { $ifNull: ['$serviceAmount', 0] } },
          totalProfit: { $sum: { $ifNull: ['$profit', 0] } },
          avgRating: { $avg: { $ifNull: ['$rating', 0] } },
          totalResponseTime: { $sum: { $ifNull: ['$responseTime', 0] } }
        }
      }
    ];

    const salesData = await ServiceActivityLog.aggregate(salesPipeline);
    console.log('Aggregated service sales data count:', salesData.length);
    
    let processedRecords = 0;
    
    for (const data of salesData) {
      const serviceId = data._id?.toString() || null;
      
      const dailyMetric = {
        day,
        salesCount: data.salesCount,
        salesAmount: data.totalSales,
        profit: data.totalProfit,
        avgRating: data.avgRating || 0,
        completionRate: 100 // Assuming completed services have 100% completion rate
      };

      const weeklyMetric = {
        week,
        salesCount: data.salesCount,
        salesAmount: data.totalSales,
        profit: data.totalProfit,
        avgRating: data.avgRating || 0,
        completionRate: 100
      };

      await ServiceMonthlyAnalytics.findOneAndUpdate(
        {
          serviceId,
          year,
          month
        },
        {
          $set: {
            [`dailyMetrics.${day - 1}`]: dailyMetric,
            lastUpdated: new Date()
          },
          $inc: {
            'monthlyTotals.salesCount': data.salesCount,
            'monthlyTotals.salesAmount': data.totalSales,
            'monthlyTotals.profit': data.totalProfit
          }
        },
        { 
          upsert: true,
          new: true
        }
      );

      await updateServiceWeeklyMetrics(serviceId, year, month, week, weeklyMetric);
      
      processedRecords++;
    }

    // Mark sales logs as processed
    await ServiceActivityLog.updateMany(
      {
        timestamp: { $gte: dayStart, $lte: dayEnd },
        activityType: 'service_completed',
        isProcessed: false
      },
      {
        $set: { isProcessed: true }
      }
    );

    const executionTime = Date.now() - startTime;
    console.log(`Daily service sales aggregation completed. Processed ${processedRecords} services in ${executionTime}ms`);

    return {
      success: true,
      processedRecords,
      executionTime
    };

  } catch (error) {
    console.error('Daily service sales aggregation failed:', error);
    throw error;
  }
}

export async function runDailyServicePerformanceAggregation(targetDate = new Date()) {
  try {
    console.log('Starting daily service performance aggregation for:', targetDate);
    const startTime = Date.now();
    
    const dayStart = moment(targetDate).startOf('day').toDate();
    const dayEnd = moment(targetDate).endOf('day').toDate();
    const year = moment(targetDate).year();
    const month = moment(targetDate).month() + 1;
    const day = moment(targetDate).date();
    const week = moment(targetDate).week();

    // Process performance activities (views, quotes, etc.)
    const performancePipeline = [
      {
        $match: {
          timestamp: { $gte: dayStart, $lte: dayEnd },
          activityType: { $in: ['viewed', 'quote_requested', 'quote_sent', 'quote_accepted', 'quote_rejected'] },
          isProcessed: false
        }
      },
      {
        $group: {
          _id: {
            serviceId: '$serviceId',
            activityType: '$activityType'
          },
          count: { $sum: 1 },
          avgResponseTime: { $avg: { $ifNull: ['$responseTime', 0] } }
        }
      }
    ];

    const performanceData = await ServiceActivityLog.aggregate(performancePipeline);
    
    // Group by service ID
    const servicePerformance = {};
    performanceData.forEach(item => {
      const serviceId = item._id.serviceId?.toString();
      if (!servicePerformance[serviceId]) {
        servicePerformance[serviceId] = {
          viewCount: 0,
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0,
          responseTime: 0
        };
      }
      
      switch (item._id.activityType) {
        case 'viewed':
          servicePerformance[serviceId].viewCount = item.count;
          break;
        case 'quote_sent':
          servicePerformance[serviceId].quotationsSent = item.count;
          break;
        case 'quote_accepted':
          servicePerformance[serviceId].quotationsAccepted = item.count;
          break;
        case 'quote_rejected':
          servicePerformance[serviceId].quotationsRejected = item.count;
          break;
        case 'quote_requested':
          servicePerformance[serviceId].quotationsInProgress = item.count;
          break;
      }
      
      if (item.avgResponseTime > 0) {
        servicePerformance[serviceId].responseTime = item.avgResponseTime;
      }
    });

    let processedRecords = 0;
    
    for (const [serviceId, metrics] of Object.entries(servicePerformance)) {
      const dailyMetric = {
        day,
        ...metrics,
        popularityScore: metrics.viewCount * 0.1 + metrics.quotationsSent * 0.5 + metrics.quotationsAccepted * 1.0
      };

      const weeklyMetric = {
        week,
        ...metrics,
        popularityScore: dailyMetric.popularityScore
      };

      await ServiceMonthlyPerformance.findOneAndUpdate(
        {
          serviceId,
          year,
          month
        },
        {
          $set: {
            [`dailyMetrics.${day - 1}`]: dailyMetric,
            lastUpdated: new Date()
          },
          $inc: {
            'monthlyTotals.viewCount': metrics.viewCount,
            'monthlyTotals.quotationsSent': metrics.quotationsSent,
            'monthlyTotals.quotationsAccepted': metrics.quotationsAccepted,
            'monthlyTotals.quotationsRejected': metrics.quotationsRejected,
            'monthlyTotals.quotationsInProgress': metrics.quotationsInProgress,
            'monthlyTotals.popularityScore': dailyMetric.popularityScore
          }
        },
        { 
          upsert: true,
          new: true
        }
      );

      await updateServicePerformanceWeeklyMetrics(serviceId, year, month, week, weeklyMetric);
      
      processedRecords++;
    }

    // Mark performance logs as processed
    await ServiceActivityLog.updateMany(
      {
        timestamp: { $gte: dayStart, $lte: dayEnd },
        activityType: { $in: ['viewed', 'quote_requested', 'quote_sent', 'quote_accepted', 'quote_rejected'] },
        isProcessed: false
      },
      {
        $set: { isProcessed: true }
      }
    );

    const executionTime = Date.now() - startTime;
    console.log(`Daily service performance aggregation completed. Processed ${processedRecords} services in ${executionTime}ms`);

    return {
      success: true,
      processedRecords,
      executionTime
    };

  } catch (error) {
    console.error('Daily service performance aggregation failed:', error);
    throw error;
  }
}

async function updateServiceWeeklyMetrics(serviceId, year, month, week, weeklyMetric) {
  try {
    const monthStart = moment({ year, month: month - 1 }).startOf('month');
    const weekStartOfMonth = monthStart.week();
    const weekIndex = week - weekStartOfMonth;
    
    if (weekIndex >= 0 && weekIndex < 6) {
      await ServiceMonthlyAnalytics.findOneAndUpdate(
        {
          serviceId,
          year,
          month
        },
        {
          $set: {
            [`weeklyMetrics.${weekIndex}`]: weeklyMetric
          }
        },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Error updating service weekly metrics:', error);
  }
}

async function updateServicePerformanceWeeklyMetrics(serviceId, year, month, week, weeklyMetric) {
  try {
    const monthStart = moment({ year, month: month - 1 }).startOf('month');
    const weekStartOfMonth = monthStart.week();
    const weekIndex = week - weekStartOfMonth;
    
    if (weekIndex >= 0 && weekIndex < 6) {
      await ServiceMonthlyPerformance.findOneAndUpdate(
        {
          serviceId,
          year,
          month
        },
        {
          $set: {
            [`weeklyMetrics.${weekIndex}`]: weeklyMetric
          }
        },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Error updating service performance weekly metrics:', error);
  }
}

export async function runMonthlyServiceAggregation(targetDate = new Date()) {
  try {
    console.log('Starting monthly service aggregation for:', targetDate);
    const startTime = Date.now();
    
    const year = moment(targetDate).year();
    const month = moment(targetDate).month() + 1;

    // Aggregate sales data
    const monthlyAnalyticsDocs = await ServiceMonthlyAnalytics.find({ year, month });
    console.log('Found monthly service analytics docs:', monthlyAnalyticsDocs.length);
    
    let processedSalesRecords = 0;
    
    for (const monthlyDoc of monthlyAnalyticsDocs) {
      const monthlyMetric = {
        month,
        salesCount: monthlyDoc.monthlyTotals.salesCount || 0,
        salesAmount: monthlyDoc.monthlyTotals.salesAmount || 0,
        profit: monthlyDoc.monthlyTotals.profit || 0,
        avgRating: monthlyDoc.monthlyTotals.avgRating || 0,
        completionRate: monthlyDoc.monthlyTotals.completionRate || 0
      };

      await ServiceYearlyAnalytics.findOneAndUpdate(
        {
          serviceId: monthlyDoc.serviceId,
          year
        },
        {
          $set: {
            [`monthlyMetrics.${month - 1}`]: monthlyMetric,
            lastUpdated: new Date()
          },
          $inc: {
            'yearlyTotals.salesCount': monthlyDoc.monthlyTotals.salesCount || 0,
            'yearlyTotals.salesAmount': monthlyDoc.monthlyTotals.salesAmount || 0,
            'yearlyTotals.profit': monthlyDoc.monthlyTotals.profit || 0
          }
        },
        { upsert: true }
      );
      
      processedSalesRecords++;
    }

    // Aggregate performance data
    const monthlyPerformanceDocs = await ServiceMonthlyPerformance.find({ year, month });
    console.log('Found monthly service performance docs:', monthlyPerformanceDocs.length);
    
    let processedPerformanceRecords = 0;
    
    for (const monthlyDoc of monthlyPerformanceDocs) {
      const monthlyMetric = {
        month,
        viewCount: monthlyDoc.monthlyTotals.viewCount || 0,
        quotationsSent: monthlyDoc.monthlyTotals.quotationsSent || 0,
        quotationsAccepted: monthlyDoc.monthlyTotals.quotationsAccepted || 0,
        quotationsRejected: monthlyDoc.monthlyTotals.quotationsRejected || 0,
        quotationsInProgress: monthlyDoc.monthlyTotals.quotationsInProgress || 0,
        popularityScore: monthlyDoc.monthlyTotals.popularityScore || 0,
        responseTime: monthlyDoc.monthlyTotals.responseTime || 0
      };

      await ServiceYearlyPerformance.findOneAndUpdate(
        {
          serviceId: monthlyDoc.serviceId,
          year
        },
        {
          $set: {
            [`monthlyMetrics.${month - 1}`]: monthlyMetric,
            lastUpdated: new Date()
          },
          $inc: {
            'yearlyTotals.viewCount': monthlyDoc.monthlyTotals.viewCount || 0,
            'yearlyTotals.quotationsSent': monthlyDoc.monthlyTotals.quotationsSent || 0,
            'yearlyTotals.quotationsAccepted': monthlyDoc.monthlyTotals.quotationsAccepted || 0,
            'yearlyTotals.quotationsRejected': monthlyDoc.monthlyTotals.quotationsRejected || 0,
            'yearlyTotals.quotationsInProgress': monthlyDoc.monthlyTotals.quotationsInProgress || 0,
            'yearlyTotals.popularityScore': monthlyDoc.monthlyTotals.popularityScore || 0,
            'yearlyTotals.responseTime': monthlyDoc.monthlyTotals.responseTime || 0
          }
        },
        { upsert: true }
      );
      
      processedPerformanceRecords++;
    }

    const executionTime = Date.now() - startTime;
    console.log(`Monthly service aggregation completed. Processed ${processedSalesRecords} sales records and ${processedPerformanceRecords} performance records in ${executionTime}ms`);

    return {
      success: true,
      processedSalesRecords,
      processedPerformanceRecords,
      executionTime
    };

  } catch (error) {
    console.error('Monthly service aggregation failed:', error);
    throw error;
  }
}

export async function cleanupOldServiceData() {
  try {
    console.log('Starting cleanup of old service data...');
    
    const cutoffDate = moment().subtract(90, 'days').toDate();
    
    const deleteResult = await ServiceActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate },
      isProcessed: true
    });

    console.log(`Cleaned up ${deleteResult.deletedCount} old service activity logs`);

    return {
      success: true,
      deletedCount: deleteResult.deletedCount
    };

  } catch (error) {
    console.error('Service cleanup failed:', error);
    throw error;
  }
}

export async function runServiceBatchJob(jobType, targetDate = new Date()) {
  try {
    console.log(`Running service batch job: ${jobType} for ${targetDate}`);
    
    let result;
    
    switch (jobType) {
      case 'daily_sales_aggregation':
        result = await runDailyServiceSalesAggregation(targetDate);
        break;
      case 'daily_performance_aggregation':
        result = await runDailyServicePerformanceAggregation(targetDate);
        break;
      case 'monthly_aggregation':
        result = await runMonthlyServiceAggregation(targetDate);
        break;
      case 'cleanup':
        result = await cleanupOldServiceData();
        break;
      default:
        throw new Error(`Invalid service job type: ${jobType}`);
    }

    console.log(`Service batch job ${jobType} completed successfully:`, result);
    return result;

  } catch (error) {
    console.error(`Service batch job ${jobType} failed:`, error);
    throw error;
  }
}

export default {
  trackServiceActivity,
  runDailyServiceSalesAggregation,
  runDailyServicePerformanceAggregation,
  runMonthlyServiceAggregation,
  cleanupOldServiceData,
  runServiceBatchJob
};