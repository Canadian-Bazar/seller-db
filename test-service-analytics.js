import mongoose from 'mongoose';
import moment from 'moment';
import { ServiceMonthlyAnalytics, ServiceYearlyAnalytics } from './api/models/service-analytics.schema.js';
import { ServiceMonthlyPerformance, ServiceYearlyPerformance } from './api/models/service-performance-analytics.schema.js';
import ServiceActivityLog from './api/models/service-activity.schema.js';
import dotenv from 'dotenv'


dotenv.config()
// Test service IDs
const testServiceIds = [
  '688934ac7f79be9309dfb26f',
  '6800aa3c70169ac6fa19becf'
];

// Generate random data
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI );
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function insertDummyServiceAnalytics() {
  console.log('📊 Inserting dummy service analytics data...');
  
  const currentYear = moment().year();
  const currentMonth = moment().month() + 1;
  
  // Generate data for last 6 months
  for (let i = 0; i < 6; i++) {
    const targetDate = moment().subtract(i, 'months');
    const year = targetDate.year();
    const month = targetDate.month() + 1;
    const daysInMonth = targetDate.daysInMonth();
    
    for (const serviceId of testServiceIds) {
      // Generate daily data for the month
      const dailyMetrics = [];
      let monthlySalesCount = 0;
      let monthlySalesAmount = 0;
      let monthlyProfit = 0;
      let totalRating = 0;
      let ratedDays = 0;
      let totalCompletionRate = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dailySalesCount = getRandomInt(0, 15);
        const avgOrderValue = getRandomFloat(50, 500);
        const dailySalesAmount = dailySalesCount * avgOrderValue;
        const profitMargin = getRandomFloat(0.2, 0.4);
        const dailyProfit = dailySalesAmount * profitMargin;
        const avgRating = getRandomFloat(3.5, 5.0);
        const completionRate = getRandomFloat(75, 100);
        
        dailyMetrics.push({
          day,
          salesCount: dailySalesCount,
          salesAmount: dailySalesAmount,
          profit: dailyProfit,
          avgRating: avgRating,
          completionRate: completionRate
        });
        
        monthlySalesCount += dailySalesCount;
        monthlySalesAmount += dailySalesAmount;
        monthlyProfit += dailyProfit;
        totalRating += avgRating;
        ratedDays++;
        totalCompletionRate += completionRate;
      }
      
      const monthlyTotals = {
        salesCount: monthlySalesCount,
        salesAmount: monthlySalesAmount,
        profit: monthlyProfit,
        avgRating: totalRating / ratedDays,
        completionRate: totalCompletionRate / daysInMonth
      };
      
      // Insert monthly analytics
      await ServiceMonthlyAnalytics.findOneAndUpdate(
        { serviceId, year, month },
        {
          serviceId,
          year,
          month,
          dailyMetrics,
          monthlyTotals
        },
        { upsert: true }
      );
    }
  }
  
  // Generate yearly data
  for (const serviceId of testServiceIds) {
    const yearlyTotals = {
      salesCount: getRandomInt(500, 2000),
      salesAmount: getRandomFloat(25000, 100000),
      profit: getRandomFloat(5000, 40000),
      avgRating: getRandomFloat(4.0, 5.0),
      completionRate: getRandomFloat(85, 98)
    };
    
    await ServiceYearlyAnalytics.findOneAndUpdate(
      { serviceId, year: currentYear },
      {
        serviceId,
        year: currentYear,
        yearlyTotals
      },
      { upsert: true }
    );
  }
  
  console.log('✅ Service analytics data inserted');
}

async function insertDummyServicePerformance() {
  console.log('📈 Inserting dummy service performance data...');
  
  const currentYear = moment().year();
  
  // Generate data for last 6 months
  for (let i = 0; i < 6; i++) {
    const targetDate = moment().subtract(i, 'months');
    const year = targetDate.year();
    const month = targetDate.month() + 1;
    const daysInMonth = targetDate.daysInMonth();
    
    for (const serviceId of testServiceIds) {
      // Generate daily performance data
      const dailyMetrics = [];
      let monthlyViewCount = 0;
      let monthlyQuotationsSent = 0;
      let monthlyQuotationsAccepted = 0;
      let monthlyQuotationsRejected = 0;
      let monthlyQuotationsInProgress = 0;
      let totalPopularityScore = 0;
      let totalResponseTime = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const viewCount = getRandomInt(10, 100);
        const quotationsSent = getRandomInt(1, 10);
        const quotationsAccepted = getRandomInt(0, Math.floor(quotationsSent * 0.7));
        const quotationsRejected = getRandomInt(0, Math.floor(quotationsSent * 0.3));
        const quotationsInProgress = quotationsSent - quotationsAccepted - quotationsRejected;
        const popularityScore = getRandomFloat(1, 10);
        const responseTime = getRandomFloat(0.5, 24); // hours
        
        dailyMetrics.push({
          day,
          viewCount,
          quotationsSent,
          quotationsAccepted,
          quotationsRejected,
          quotationsInProgress,
          popularityScore,
          responseTime
        });
        
        monthlyViewCount += viewCount;
        monthlyQuotationsSent += quotationsSent;
        monthlyQuotationsAccepted += quotationsAccepted;
        monthlyQuotationsRejected += quotationsRejected;
        monthlyQuotationsInProgress += quotationsInProgress;
        totalPopularityScore += popularityScore;
        totalResponseTime += responseTime;
      }
      
      const monthlyTotals = {
        viewCount: monthlyViewCount,
        quotationsSent: monthlyQuotationsSent,
        quotationsAccepted: monthlyQuotationsAccepted,
        quotationsRejected: monthlyQuotationsRejected,
        quotationsInProgress: monthlyQuotationsInProgress,
        popularityScore: totalPopularityScore / daysInMonth,
        responseTime: totalResponseTime / daysInMonth
      };
      
      // Insert monthly performance
      await ServiceMonthlyPerformance.findOneAndUpdate(
        { serviceId, year, month },
        {
          serviceId,
          year,
          month,
          dailyMetrics,
          monthlyTotals
        },
        { upsert: true }
      );
    }
  }
  
  // Generate yearly performance data
  for (const serviceId of testServiceIds) {
    const yearlyTotals = {
      viewCount: getRandomInt(3000, 10000),
      quotationsSent: getRandomInt(200, 800),
      quotationsAccepted: getRandomInt(100, 400),
      quotationsRejected: getRandomInt(50, 200),
      quotationsInProgress: getRandomInt(30, 150),
      popularityScore: getRandomFloat(5.0, 9.5),
      responseTime: getRandomFloat(2, 12)
    };
    
    await ServiceYearlyPerformance.findOneAndUpdate(
      { serviceId, year: currentYear },
      {
        serviceId,
        year: currentYear,
        yearlyTotals
      },
      { upsert: true }
    );
  }
  
  console.log('✅ Service performance data inserted');
}

async function insertDummyServiceActivity() {
  console.log('🔄 Inserting dummy service activity data...');
  
  // Generate recent activity logs
  const sellerIds = [
    '507f1f77bcf86cd799439011', // Dummy seller ID 1
    '507f1f77bcf86cd799439012'  // Dummy seller ID 2
  ];
  
  for (let i = 0; i < 100; i++) {
    const randomServiceId = testServiceIds[Math.floor(Math.random() * testServiceIds.length)];
    const randomSellerId = sellerIds[Math.floor(Math.random() * sellerIds.length)];
    const activityTypes = ['viewed', 'quote_sent', 'quote_accepted', 'quote_rejected', 'service_completed'];
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    
    const activityData = {};
    
    switch (activityType) {
      case 'service_completed':
        Object.assign(activityData, {
          serviceAmount: getRandomFloat(50, 500),
          profit: getRandomFloat(10, 200),
          rating: getRandomFloat(3.5, 5.0)
        });
        break;
      case 'viewed':
        Object.assign(activityData, { source: 'search' });
        break;
      case 'quote_sent':
        Object.assign(activityData, { 
          quotationValue: getRandomFloat(100, 1000),
          responseTime: getRandomFloat(0.5, 24)
        });
        break;
    }
    
    await ServiceActivityLog.create({
      serviceId: randomServiceId,
      sellerId: randomSellerId,
      buyerId: '507f1f77bcf86cd799439013', // Dummy buyer ID
      activityType,
      timestamp: moment().subtract(getRandomInt(0, 30), 'days').toDate(),
      serviceAmount: activityData.serviceAmount || 0,
      profit: activityData.profit || 0,
      rating: activityType === 'service_completed' ? (activityData.rating || 5) : undefined,
      responseTime: activityData.responseTime || 0,
      isProcessed: false
    });
  }
  
  console.log('✅ Service activity data inserted');
}

async function testServiceAnalyticsEndpoints() {
  console.log('🧪 Testing Service Analytics Endpoints...');
  
  const testCases = [
    {
      name: 'Monthly Sales Analytics - Last 3 months',
      endpoint: 'service-analytics',
      payload: {
        services: testServiceIds,
        from: moment().subtract(3, 'months').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
        granularity: 'months',
        type: 'salesCount'
      }
    },
    {
      name: 'Daily Sales Amount - Last 30 days',
      endpoint: 'service-analytics',
      payload: {
        services: testServiceIds,
        from: moment().subtract(30, 'days').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
        granularity: 'days',
        type: 'salesAmount'
      }
    },
    {
      name: 'Profit Analytics - Last 6 months',
      endpoint: 'service-analytics',
      payload: {
        services: testServiceIds,
        from: moment().subtract(6, 'months').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
        granularity: 'months',
        type: 'profit'
      }
    },
    {
      name: 'Analytics Summary',
      endpoint: 'service-analytics/summary',
      payload: {
        services: testServiceIds,
        from: moment().subtract(3, 'months').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD')
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log('POST /api/v1/' + testCase.endpoint);
    console.log('Payload:', JSON.stringify(testCase.payload, null, 2));
    console.log('---');
  }
}

async function testServicePerformanceEndpoints() {
  console.log('🎯 Testing Service Performance Endpoints...');
  
  const testCases = [
    {
      name: 'View Count Performance - Monthly',
      endpoint: 'service-performance',
      payload: {
        services: testServiceIds,
        from: moment().subtract(3, 'months').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
        granularity: 'months',
        type: 'viewCount'
      }
    },
    {
      name: 'Quotations Sent - Daily (Last 15 days)',
      endpoint: 'service-performance',
      payload: {
        services: testServiceIds,
        from: moment().subtract(15, 'days').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
        granularity: 'days',
        type: 'quotationsSent'
      }
    },
    {
      name: 'Acceptance Rate Performance',
      endpoint: 'service-performance',
      payload: {
        services: testServiceIds,
        from: moment().subtract(2, 'months').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
        granularity: 'weeks',
        type: 'quotationsAccepted'
      }
    },
    {
      name: 'Response Time Analytics',
      endpoint: 'service-performance',
      payload: {
        services: testServiceIds,
        from: moment().subtract(1, 'month').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
        granularity: 'days',
        type: 'responseTime'
      }
    },
    {
      name: 'Performance Summary',
      endpoint: 'service-performance/summary',
      payload: {
        services: testServiceIds,
        from: moment().subtract(3, 'months').format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD')
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log('POST /api/v1/' + testCase.endpoint);
    console.log('Payload:', JSON.stringify(testCase.payload, null, 2));
    console.log('---');
  }
}

async function main() {
  try {
    await connectDB();
    
    console.log('🚀 Starting Service Analytics Test Script...\n');
    
    // Insert dummy data
    await insertDummyServiceAnalytics();
    await insertDummyServicePerformance();
    await insertDummyServiceActivity();
    
    console.log('\n🎯 Test Data Insertion Complete!\n');
    console.log('📊 Test Service IDs:');
    testServiceIds.forEach((id, index) => {
      console.log(`${index + 1}. ${id}`);
    });
    
    console.log('\n📈 Data Generated:');
    console.log('- 6 months of analytics data');
    console.log('- 6 months of performance data');
    console.log('- 100 activity log entries');
    console.log('- Daily, monthly, and yearly aggregations');
    
    console.log('\n🧪 Test Cases for Postman:');
    console.log('=' * 50);
    
    await testServiceAnalyticsEndpoints();
    await testServicePerformanceEndpoints();
    
    console.log('\n✅ Test script completed successfully!');
    console.log('\nYou can now test these endpoints in Postman with the provided payloads.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

main();