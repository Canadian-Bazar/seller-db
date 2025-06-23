import { 
  ProductMonthlyAnalytics, 
  ProductYearlyAnalytics 
} from '../api/models/product-analytics.schema.js';
import moment from 'moment';
import ProductActivityLog from '../api/models/product-activity.schema.js';
import { runDailyAggregation, runMonthlyAggregation } from '../api/batches/product-analytics.batch.js';

// =============================================================================
// CLEAR AND INSERT PROPER ANALYTICS DATA
// =============================================================================

export async function insertProperAnalyticsData(productIds) {
  console.log('🗑️ Clearing existing analytics data...');
  
  // Clear existing data for test products
  await ProductActivityLog.deleteMany({ productId: { $in: productIds } });
  await ProductMonthlyAnalytics.deleteMany({ productId: { $in: productIds } });
  await ProductYearlyAnalytics.deleteMany({ productId: { $in: productIds } });

  console.log('📊 Inserting proper analytics data...');

  const monthlyDocs = [];
  const yearlyDocs = [];

  for (const productId of productIds) {
    // June 2024 monthly data
    const monthlyDoc = {
      productId,
      year: 2024,
      month: 6,
      dailyMetrics: [
        null, null, null, null, null, null, null, null, null, null, // Days 1-10
        null, null, null, null, null, null, // Days 11-16
        { day: 17, salesCount: 2, salesAmount: 200, profit: 40 }, // June 17
        { day: 18, salesCount: 3, salesAmount: 300, profit: 60 }, // June 18
        { day: 19, salesCount: 1, salesAmount: 100, profit: 20 }, // June 19
        { day: 20, salesCount: 4, salesAmount: 400, profit: 80 }, // June 20
        { day: 21, salesCount: 2, salesAmount: 200, profit: 40 }, // June 21
        { day: 22, salesCount: 3, salesAmount: 300, profit: 60 }  // June 22
      ],
      weeklyMetrics: [
        { week: 25, salesCount: 15, salesAmount: 1500, profit: 300 }
      ],
      monthlyTotals: {
        salesCount: 15,
        salesAmount: 1500,
        profit: 300
      }
    };
    
    monthlyDocs.push(monthlyDoc);

    // 2024 yearly data with proper array structure
    const monthlyMetrics = new Array(12).fill(null);
    monthlyMetrics[5] = { // June is index 5 (0-based)
      month: 6, 
      salesCount: 15, 
      salesAmount: 1500, 
      profit: 300 
    };

    const yearlyDoc = {
      productId,
      year: 2024,
      monthlyMetrics,
      yearlyTotals: {
        salesCount: 15,
        salesAmount: 1500,
        profit: 300
      }
    };
    
    yearlyDocs.push(yearlyDoc);
  }

  // Insert the documents
  await ProductMonthlyAnalytics.insertMany(monthlyDocs);
  await ProductYearlyAnalytics.insertMany(yearlyDocs);

  console.log(`✅ Inserted ${monthlyDocs.length} monthly and ${yearlyDocs.length} yearly analytics docs`);
  
  return {
    monthlyDocs: monthlyDocs.length,
    yearlyDocs: yearlyDocs.length
  };
}

// =============================================================================
// GENERATE TEST ACTIVITY LOGS
// =============================================================================

export async function generateTestSalesData(options = {}) {
  const {
    productIds = [],
    startDate = moment().subtract(30, 'days').toDate(),
    endDate = new Date(),
    salesPerDay = { min: 1, max: 5 },
    saleAmount = { min: 100, max: 1000 },
    profit = { min: 20, max: 200 }
  } = options;

  console.log('🧪 Generating test sales activity logs...');
  console.log('Products:', productIds);
  console.log('Date range:', startDate, 'to', endDate);

  const testLogs = [];
  let current = moment(startDate);
  
  while (current <= moment(endDate)) {
    for (const productId of productIds) {
      const dailySales = Math.floor(Math.random() * (salesPerDay.max - salesPerDay.min + 1)) + salesPerDay.min;
      
      for (let i = 0; i < dailySales; i++) {
        const randomSaleAmount = Math.floor(Math.random() * (saleAmount.max - saleAmount.min + 1)) + saleAmount.min;
        const randomProfit = Math.floor(Math.random() * (profit.max - profit.min + 1)) + profit.min;
        const randomTime = current.clone().add(Math.floor(Math.random() * 24), 'hours').add(Math.floor(Math.random() * 60), 'minutes');
        
        testLogs.push({
          productId,
          userId: null,
          activityType: 'sold',
          saleAmount: randomSaleAmount,
          profit: randomProfit,
          timestamp: randomTime.toDate(),
          isProcessed: false
        });
      }
    }
    current.add(1, 'day');
  }

  if (testLogs.length > 0) {
    await ProductActivityLog.insertMany(testLogs);
    console.log(`✅ Generated ${testLogs.length} test sales activity logs`);
  }

  return testLogs;
}

// =============================================================================
// TEST BATCH PROCESSING
// =============================================================================

export async function testBatchProcessing(options = {}) {
  const {
    productIds = [],
    testDates = [
      moment().subtract(3, 'days').toDate(),
      moment().subtract(2, 'days').toDate(),
      moment().subtract(1, 'day').toDate()
    ]
  } = options;

  console.log('🧪 Testing batch processing...');
  
  const results = {
    dailyResults: [],
    monthlyResults: [],
    errors: []
  };

  try {
    for (const testDate of testDates) {
      console.log(`📅 Testing daily aggregation for ${testDate}`);
      
      try {
        const dailyResult = await runDailyAggregation(testDate);
        results.dailyResults.push({
          date: testDate,
          result: dailyResult
        });
        console.log(`✅ Daily aggregation successful for ${testDate}:`, dailyResult);
      } catch (error) {
        console.error(`❌ Daily aggregation failed for ${testDate}:`, error);
        results.errors.push({ type: 'daily', date: testDate, error: error.message });
      }
    }

    const testMonths = [...new Set(testDates.map(date => `${moment(date).year()}-${moment(date).month() + 1}`))];
    
    for (const monthStr of testMonths) {
      const [year, month] = monthStr.split('-').map(Number);
      const testDate = moment({ year, month: month - 1 }).toDate();
      
      console.log(`📅 Testing monthly aggregation for ${year}-${month}`);
      
      try {
        const monthlyResult = await runMonthlyAggregation(testDate);
        results.monthlyResults.push({
          year,
          month,
          result: monthlyResult
        });
        console.log(`✅ Monthly aggregation successful for ${year}-${month}:`, monthlyResult);
      } catch (error) {
        console.error(`❌ Monthly aggregation failed for ${year}-${month}:`, error);
        results.errors.push({ type: 'monthly', year, month, error: error.message });
      }
    }

  } catch (error) {
    console.error('❌ Batch processing test failed:', error);
    results.errors.push({ type: 'general', error: error.message });
  }

  return results;
}

// =============================================================================
// COMPLETE TEST SUITE
// =============================================================================

export async function runCompleteTest(productIds) {
  console.log('🚀 Running complete analytics test suite...');
  console.log('Product IDs:', productIds);

  const testResults = {
    step1_dataClearing: null,
    step2_analyticsInsertion: null,
    step3_activityGeneration: null,
    step4_batchProcessing: null,
    errors: []
  };

  try {
    console.log('\n🗑️ STEP 1: Clearing and inserting proper analytics data...');
    testResults.step2_analyticsInsertion = await insertProperAnalyticsData(productIds);

    console.log('\n📊 STEP 2: Generating test activity logs...');
    testResults.step3_activityGeneration = await generateTestSalesData({
      productIds,
      startDate: moment().subtract(5, 'days').toDate(),
      endDate: new Date(),
      salesPerDay: { min: 2, max: 5 },
      saleAmount: { min: 50, max: 500 },
      profit: { min: 10, max: 100 }
    });

    console.log('\n⚙️ STEP 3: Testing batch processing...');
    testResults.step4_batchProcessing = await testBatchProcessing({
      productIds,
      testDates: [
        moment().subtract(3, 'days').toDate(),
        moment().subtract(2, 'days').toDate(),
        moment().subtract(1, 'day').toDate()
      ]
    });

    console.log('\n✅ COMPLETE TEST SUITE FINISHED!');
    console.log('\n📋 SUMMARY:');
    console.log(`- Analytics docs inserted: ${testResults.step2_analyticsInsertion.monthlyDocs} monthly, ${testResults.step2_analyticsInsertion.yearlyDocs} yearly`);
    console.log(`- Activity logs generated: ${testResults.step3_activityGeneration.length}`);
    console.log(`- Daily aggregations: ${testResults.step4_batchProcessing.dailyResults.length} successful`);
    console.log(`- Monthly aggregations: ${testResults.step4_batchProcessing.monthlyResults.length} successful`);
    console.log(`- Errors: ${testResults.step4_batchProcessing.errors.length}`);

    console.log('\n🎯 YOU CAN NOW TEST THESE API CALLS:');
    console.log('1. Daily: from=2024-06-17, to=2024-06-22, granularity=days');
    console.log('2. Monthly: from=2024-06-01, to=2024-06-30, granularity=months');
    console.log('3. Recent days with batch processed data');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    testResults.errors.push(error.message);
  }

  return testResults;
}