import { 
 
  ProductMonthlyAnalytics, 
  ProductYearlyAnalytics 
} from '../models/product-analytics.schema.js';
import moment from 'moment';
import ProductActivityLog from '../models/product-activity.schema.js'

export async function trackProductSale(productId, saleAmount, profit, userId = null) {
  try {
    const { redisClient, REDIS_KEYS } = await import('../redis.config.js');
    
    console.log('Tracking product sale:', { productId, saleAmount, profit });
    
    const key = `${REDIS_KEYS.PRODUCT_ACTIVITY}${productId}`;
    await redisClient.hincrby(key, 'sold', 1);
    await redisClient.hincrbyfloat(key, 'totalSales', saleAmount);
    await redisClient.hincrbyfloat(key, 'totalProfit', profit);
    await redisClient.hset(key, 'lastInteracted', Date.now().toString());

    const ttl = await redisClient.ttl(key);
    if (ttl < 0) {
      await redisClient.expire(key, 30 * 24 * 60 * 60); // 30 days
    }

    await ProductActivityLog.create({
      productId,
      userId,
      activityType: 'sold',
      saleAmount,
      profit,
      timestamp: new Date()
    });

    console.log('Product sale tracked successfully');

  } catch (error) {
    console.error('Error tracking product sale:', {
      productId,
      saleAmount,
      profit,
      userId,
      error: error.message
    });
    throw error;
  }
}

export async function runDailyAggregation(targetDate = new Date()) {
  try {
    console.log('Starting daily aggregation for:', targetDate);
    const startTime = Date.now();
    
    const dayStart = moment(targetDate).startOf('day').toDate();
    const dayEnd = moment(targetDate).endOf('day').toDate();
    const year = moment(targetDate).year();
    const month = moment(targetDate).month() + 1; // 1-12
    const day = moment(targetDate).date(); // 1-31
    const week = moment(targetDate).week(); // Week of year

    console.log('Processing date range:', { dayStart, dayEnd, year, month, day, week });

    // ✅ ONLY PROCESS SALES DATA (not views, quotations, etc.)
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: dayStart, $lte: dayEnd },
          activityType: 'sold', // ← ONLY sales activities
          isProcessed: false
        }
      },
      {
        $group: {
          _id: '$productId', // ← Group only by productId (not activityType)
          salesCount: { $sum: 1 },
          totalSales: { $sum: { $ifNull: ['$saleAmount', 0] } },
          totalProfit: { $sum: { $ifNull: ['$profit', 0] } }
        }
      }
    ];

    const aggregatedData = await ProductActivityLog.aggregate(pipeline);
    console.log('Aggregated sales data count:', aggregatedData.length);
    
    let processedRecords = 0;
    
    // ✅ SIMPLIFIED: Process only sales data
    for (const salesData of aggregatedData) {
      const productId = salesData._id?.toString() || null;
      
      const dailyMetric = {
        day,
        salesCount: salesData.salesCount,
        salesAmount: salesData.totalSales,
        profit: salesData.totalProfit
      };

      const weeklyMetric = {
        week,
        salesCount: salesData.salesCount,
        salesAmount: salesData.totalSales,
        profit: salesData.totalProfit
      };

      // ✅ UPDATE ONLY SALES FIELDS
      await ProductMonthlyAnalytics.findOneAndUpdate(
        {
          productId,
          year,
          month
        },
        {
          $set: {
            [`dailyMetrics.${day - 1}`]: dailyMetric,
            lastUpdated: new Date()
          },
          $inc: {
            // ✅ ONLY INCREMENT SALES TOTALS
            'monthlyTotals.salesCount': salesData.salesCount,
            'monthlyTotals.salesAmount': salesData.totalSales,
            'monthlyTotals.profit': salesData.totalProfit
          }
        },
        { 
          upsert: true,
          new: true
        }
      );

      await updateWeeklyMetrics(productId, year, month, week, weeklyMetric);
      
      processedRecords++;
    }

    // ✅ MARK ONLY SALES LOGS AS PROCESSED
    await ProductActivityLog.updateMany(
      {
        timestamp: { $gte: dayStart, $lte: dayEnd },
        activityType: 'sold', // ← ONLY sales logs
        isProcessed: false
      },
      {
        $set: { isProcessed: true }
      }
    );

    const executionTime = Date.now() - startTime;
    console.log(`Daily sales aggregation completed. Processed ${processedRecords} products in ${executionTime}ms`);

    return {
      success: true,
      processedRecords,
      executionTime
    };

  } catch (error) {
    console.error('Daily sales aggregation failed:', error);
    throw error;
  }
}

// ✅ SIMPLIFIED WEEKLY METRICS UPDATE
async function updateWeeklyMetrics(productId, year, month, week, weeklyMetric) {
  try {
    const monthStart = moment({ year, month: month - 1 }).startOf('month');
    const weekStartOfMonth = monthStart.week();
    const weekIndex = week - weekStartOfMonth;
    
    if (weekIndex >= 0 && weekIndex < 6) { // Max 6 weeks in a month
      await ProductMonthlyAnalytics.findOneAndUpdate(
        {
          productId,
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
    console.error('Error updating weekly metrics:', error);
  }
}

export async function runMonthlyAggregation(targetDate = new Date()) {
  try {
    console.log('Starting monthly aggregation for:', targetDate);
    const startTime = Date.now();
    
    const year = moment(targetDate).year();
    const month = moment(targetDate).month() + 1;

    const monthlyDocs = await ProductMonthlyAnalytics.find({ year, month });
    console.log('Found monthly docs:', monthlyDocs.length);
    
    let processedRecords = 0;
    
    for (const monthlyDoc of monthlyDocs) {
      // ✅ ONLY SALES DATA IN MONTHLY METRIC
      const monthlyMetric = {
        month,
        salesCount: monthlyDoc.monthlyTotals.salesCount || 0,
        salesAmount: monthlyDoc.monthlyTotals.salesAmount || 0,
        profit: monthlyDoc.monthlyTotals.profit || 0
      };

      // ✅ UPDATE ONLY SALES FIELDS IN YEARLY
      await ProductYearlyAnalytics.findOneAndUpdate(
        {
          productId: monthlyDoc.productId,
          year
        },
        {
          $set: {
            [`monthlyMetrics.${month - 1}`]: monthlyMetric,
            lastUpdated: new Date()
          },
          $inc: {
            // ✅ ONLY INCREMENT SALES TOTALS
            'yearlyTotals.salesCount': monthlyDoc.monthlyTotals.salesCount || 0,
            'yearlyTotals.salesAmount': monthlyDoc.monthlyTotals.salesAmount || 0,
            'yearlyTotals.profit': monthlyDoc.monthlyTotals.profit || 0
          }
        },
        { upsert: true }
      );
      
      processedRecords++;
    }

    const executionTime = Date.now() - startTime;
    console.log(`Monthly sales aggregation completed. Processed ${processedRecords} products in ${executionTime}ms`);

    return {
      success: true,
      processedRecords,
      executionTime
    };

  } catch (error) {
    console.error('Monthly sales aggregation failed:', error);
    throw error;
  }
}

export async function cleanupOldData() {
  try {
    console.log('Starting cleanup of old data...');
    
    const cutoffDate = moment().subtract(90, 'days').toDate();
    
    // ✅ CLEANUP ALL PROCESSED LOGS (sales, views, quotations)
    const deleteResult = await ProductActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate },
      isProcessed: true
    });

    console.log(`Cleaned up ${deleteResult.deletedCount} old activity logs`);

    return {
      success: true,
      deletedCount: deleteResult.deletedCount
    };

  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

export async function runBatchJob(jobType, targetDate = new Date()) {
  try {
    console.log(`Running batch job: ${jobType} for ${targetDate}`);
    
    let result;
    
    switch (jobType) {
      case 'daily_aggregation':
        result = await runDailyAggregation(targetDate);
        break;
      case 'monthly_aggregation':
        result = await runMonthlyAggregation(targetDate);
        break;
      case 'cleanup':
        result = await cleanupOldData();
        break;
      default:
        throw new Error(`Invalid job type: ${jobType}`);
    }

    console.log(`Batch job ${jobType} completed successfully:`, result);
    return result;

  } catch (error) {
    console.error(`Batch job ${jobType} failed:`, error);
    throw error;
  }
}

export default {
  trackProductSale,
  runDailyAggregation,
  runMonthlyAggregation,
  cleanupOldData,
  runBatchJob
};