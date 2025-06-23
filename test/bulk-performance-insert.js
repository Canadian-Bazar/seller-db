import mongoose from 'mongoose';
import { ProductMonthlyPerformance, ProductYearlyPerformance } from '../api/models/product-performance-analytics.schema.js';
import ProductActivityLog from '../api/models/product-activity.schema.js';
import moment from 'moment';

// Your 10 product IDs
const productIds = [
  '681cea709d0bb2a23d0b36d9',
  '681cea709d0bb2a23d0b36db', 
  '681cea709d0bb2a23d0b36dc',
  '681cea709d0bb2a23d0b36dd',
  '681cea709d0bb2a23d0b36de',
  '681cea709d0bb2a23d0b36df',
  '681cea709d0bb2a23d0b36e0',
  '681cea709d0bb2a23d0b36e1',
  '681cea709d0bb2a23d0b36e2',
  '681cea709d0bb2a23d0b36e6'
];

// Connect to MongoDB
const mongoURI = 'mongodb+srv://devmishrayash:Lo7XBBFhFGGXNh9E@canadianbazaar.jry947b.mongodb.net/CanadianBazaar?retryWrites=true&w=majority&appName=CanadianBazaar';
await mongoose.connect(mongoURI);
console.log('✅ Connected to MongoDB');

async function insertBulkPerformanceData() {
  console.log('🗑️ Clearing existing performance data...');
  
  // Clear existing data for all products
  await ProductActivityLog.deleteMany({ productId: { $in: productIds } });
  await ProductMonthlyPerformance.deleteMany({ productId: { $in: productIds } });
  await ProductYearlyPerformance.deleteMany({ productId: { $in: productIds } });
  
  console.log('📊 Generating 18 months of performance analytics data...');
  
  // Define product performance profiles (some products get more engagement than others)
  const productProfiles = {
    '681cea709d0bb2a23d0b36d9': { multiplier: 2.0, trend: 'viral' },        // High engagement, viral growth
    '681cea709d0bb2a23d0b36db': { multiplier: 1.5, trend: 'growing' },      // Good engagement, steady growth
    '681cea709d0bb2a23d0b36dc': { multiplier: 0.6, trend: 'declining' },    // Low engagement, declining
    '681cea709d0bb2a23d0b36dd': { multiplier: 1.2, trend: 'seasonal' },     // Seasonal engagement spikes
    '681cea709d0bb2a23d0b36de': { multiplier: 1.8, trend: 'growing' },      // High growth potential
    '681cea709d0bb2a23d0b36df': { multiplier: 0.4, trend: 'stable' },       // Low but consistent engagement
    '681cea709d0bb2a23d0b36e0': { multiplier: 1.0, trend: 'stable' },       // Average performer
    '681cea709d0bb2a23d0b36e1': { multiplier: 0.8, trend: 'declining' },    // Moderate decline
    '681cea709d0bb2a23d0b36e2': { multiplier: 1.6, trend: 'seasonal' },     // Strong seasonal patterns
    '681cea709d0bb2a23d0b36e6': { multiplier: 1.1, trend: 'growing' }       // Slow but steady growth
  };
  
  // Generate data for 18 months (Jan 2023 - June 2024)
  const months = [];
  for (let year = 2023; year <= 2024; year++) {
    const endMonth = year === 2024 ? 6 : 12; // Only Jan-June for 2024
    for (let month = 1; month <= endMonth; month++) {
      months.push({ year, month });
    }
  }
  
  const monthlyDocs = [];
  const yearlyData = {};
  
  for (const productId of productIds) {
    const profile = productProfiles[productId];
    
    for (let i = 0; i < months.length; i++) {
      const { year, month } = months[i];
      
      // Base engagement metrics that vary by month
      let baseViews = 500;           // Base monthly views
      let baseQuotations = 25;       // Base monthly quotations
      let baseAccepted = 8;          // Base accepted quotations
      let baseRejected = 12;         // Base rejected quotations
      let baseInProgress = 5;        // Base in-progress quotations
      
      // Seasonal adjustments for engagement
      if ([11, 12, 1].includes(month)) {
        baseViews *= 1.6;           // Holiday season boost
        baseQuotations *= 1.4;
        baseAccepted *= 1.3;
      }
      if ([6, 7, 8].includes(month)) {
        baseViews *= 1.3;           // Summer activity boost
        baseQuotations *= 1.2;
        baseAccepted *= 1.1;
      }
      if ([2, 3].includes(month)) {
        baseViews *= 0.7;           // Winter slowdown
        baseQuotations *= 0.8;
        baseAccepted *= 0.9;
      }
      
      // Apply product profile multiplier
      baseViews = Math.round(baseViews * profile.multiplier);
      baseQuotations = Math.round(baseQuotations * profile.multiplier);
      baseAccepted = Math.round(baseAccepted * profile.multiplier);
      baseRejected = Math.round(baseRejected * profile.multiplier);
      baseInProgress = Math.round(baseInProgress * profile.multiplier);
      
      // Apply trend over time
      const monthIndex = i;
      switch (profile.trend) {
        case 'viral':
          const viralGrowth = Math.pow(1.08, monthIndex); // Exponential viral growth
          baseViews = Math.round(baseViews * viralGrowth);
          baseQuotations = Math.round(baseQuotations * Math.pow(1.06, monthIndex));
          baseAccepted = Math.round(baseAccepted * Math.pow(1.05, monthIndex));
          break;
        case 'growing':
          baseViews = Math.round(baseViews * (1 + monthIndex * 0.04)); // 4% growth per month
          baseQuotations = Math.round(baseQuotations * (1 + monthIndex * 0.03));
          baseAccepted = Math.round(baseAccepted * (1 + monthIndex * 0.025));
          break;
        case 'declining':
          baseViews = Math.round(baseViews * (1 - monthIndex * 0.025)); // 2.5% decline per month
          baseQuotations = Math.round(baseQuotations * (1 - monthIndex * 0.02));
          baseAccepted = Math.round(baseAccepted * (1 - monthIndex * 0.015));
          break;
        case 'seasonal':
          const seasonalWave = Math.sin((monthIndex * Math.PI) / 6) * 0.4; // Stronger seasonal waves
          baseViews = Math.round(baseViews * (1 + seasonalWave));
          baseQuotations = Math.round(baseQuotations * (1 + seasonalWave * 0.8));
          baseAccepted = Math.round(baseAccepted * (1 + seasonalWave * 0.6));
          break;
        // stable = no change
      }
      
      // Ensure minimum values
      baseViews = Math.max(10, baseViews);
      baseQuotations = Math.max(1, baseQuotations);
      baseAccepted = Math.max(0, baseAccepted);
      baseRejected = Math.max(0, baseRejected);
      baseInProgress = Math.max(0, baseInProgress);
      
      // Calculate performance scores
      const popularityScore = baseViews + (baseQuotations * 5);
      const bestsellerScore = baseAccepted;
      
      // Generate daily metrics (distribute monthly engagement across days)
      const daysInMonth = moment({ year, month: month - 1 }).daysInMonth();
      const dailyMetrics = new Array(31).fill(null);
      
      let remainingViews = baseViews;
      let remainingQuotations = baseQuotations;
      let remainingAccepted = baseAccepted;
      let remainingRejected = baseRejected;
      let remainingInProgress = baseInProgress;
      
      for (let day = 1; day <= daysInMonth; day++) {
        if (Math.random() > 0.1) { // 90% chance of activity on any day
          const dailyViews = Math.min(remainingViews, Math.floor(Math.random() * Math.ceil(baseViews / 15)) + 1);
          const dailyQuotations = Math.min(remainingQuotations, Math.floor(Math.random() * Math.ceil(baseQuotations / 15)) + (Math.random() > 0.7 ? 1 : 0));
          const dailyAccepted = Math.min(remainingAccepted, Math.floor(Math.random() * Math.ceil(baseAccepted / 15)) + (Math.random() > 0.8 ? 1 : 0));
          const dailyRejected = Math.min(remainingRejected, Math.floor(Math.random() * Math.ceil(baseRejected / 15)) + (Math.random() > 0.7 ? 1 : 0));
          const dailyInProgress = Math.min(remainingInProgress, Math.floor(Math.random() * Math.ceil(baseInProgress / 15)) + (Math.random() > 0.8 ? 1 : 0));
          
          if (dailyViews > 0 || dailyQuotations > 0) {
            dailyMetrics[day - 1] = {
              day,
              viewCount: dailyViews,
              quotationsSent: dailyQuotations,
              quotationsAccepted: dailyAccepted,
              quotationsRejected: dailyRejected,
              quotationsInProgress: dailyInProgress,
              popularityScore: dailyViews + (dailyQuotations * 5),
              bestsellerScore: dailyAccepted
            };
            
            remainingViews -= dailyViews;
            remainingQuotations -= dailyQuotations;
            remainingAccepted -= dailyAccepted;
            remainingRejected -= dailyRejected;
            remainingInProgress -= dailyInProgress;
          }
        }
      }
      
      // Create weekly metrics (simplified - one week per month for demo)
      const weeklyMetrics = [{
        week: moment({ year, month: month - 1 }).week(),
        viewCount: baseViews,
        quotationsSent: baseQuotations,
        quotationsAccepted: baseAccepted,
        quotationsRejected: baseRejected,
        quotationsInProgress: baseInProgress,
        popularityScore: popularityScore,
        bestsellerScore: bestsellerScore
      }];
      
      // Create monthly document
      const monthlyDoc = {
        productId,
        year,
        month,
        dailyMetrics,
        weeklyMetrics,
        monthlyTotals: {
          viewCount: baseViews,
          quotationsSent: baseQuotations,
          quotationsAccepted: baseAccepted,
          quotationsRejected: baseRejected,
          quotationsInProgress: baseInProgress,
          popularityScore: popularityScore,
          bestsellerScore: bestsellerScore
        }
      };
      
      monthlyDocs.push(monthlyDoc);
      
      // Prepare yearly data
      const yearKey = `${productId}-${year}`;
      if (!yearlyData[yearKey]) {
        yearlyData[yearKey] = {
          productId,
          year,
          monthlyMetrics: new Array(12).fill(null),
          yearlyTotals: {
            viewCount: 0,
            quotationsSent: 0,
            quotationsAccepted: 0,
            quotationsRejected: 0,
            quotationsInProgress: 0,
            popularityScore: 0,
            bestsellerScore: 0
          }
        };
      }
      
      const yearlyDoc = yearlyData[yearKey];
      yearlyDoc.monthlyMetrics[month - 1] = {
        month,
        viewCount: baseViews,
        quotationsSent: baseQuotations,
        quotationsAccepted: baseAccepted,
        quotationsRejected: baseRejected,
        quotationsInProgress: baseInProgress,
        popularityScore: popularityScore,
        bestsellerScore: bestsellerScore
      };
      
      yearlyDoc.yearlyTotals.viewCount += baseViews;
      yearlyDoc.yearlyTotals.quotationsSent += baseQuotations;
      yearlyDoc.yearlyTotals.quotationsAccepted += baseAccepted;
      yearlyDoc.yearlyTotals.quotationsRejected += baseRejected;
      yearlyDoc.yearlyTotals.quotationsInProgress += baseInProgress;
      yearlyDoc.yearlyTotals.popularityScore += popularityScore;
      yearlyDoc.yearlyTotals.bestsellerScore += bestsellerScore;
    }
  }
  
  // Insert monthly documents
  console.log(`📊 Inserting ${monthlyDocs.length} monthly performance documents...`);
  await ProductMonthlyPerformance.insertMany(monthlyDocs);
  
  // Insert yearly documents
  const yearlyDocs = Object.values(yearlyData);
  console.log(`📊 Inserting ${yearlyDocs.length} yearly performance documents...`);
  await ProductYearlyPerformance.insertMany(yearlyDocs);
  
  // Generate some recent activity logs for batch processing tests
  console.log('📝 Generating recent activity logs...');
  const activityLogs = [];
  const today = moment();
  
  for (let i = 1; i <= 7; i++) { // Last 7 days
    const date = today.clone().subtract(i, 'days');
    
    for (const productId of productIds) {
      const profile = productProfiles[productId];
      
      // Generate different types of activities
      const dailyViews = Math.floor(Math.random() * 50 * profile.multiplier) + 5;
      const dailyQuotations = Math.floor(Math.random() * 8 * profile.multiplier) + 1;
      const dailyAccepted = Math.floor(Math.random() * 3 * profile.multiplier);
      const dailyRejected = Math.floor(Math.random() * 4 * profile.multiplier);
      const dailyInProgress = Math.floor(Math.random() * 2 * profile.multiplier);
      
      // Add view activities
      if (dailyViews > 0) {
        activityLogs.push({
          productId,
          userId: null,
          activityType: 'view',
          count: dailyViews,
          timestamp: date.clone().add(Math.random() * 24, 'hours').toDate(),
          isProcessed: false
        });
      }
      
      // Add quotation activities
      if (dailyQuotations > 0) {
        activityLogs.push({
          productId,
          userId: null,
          activityType: 'sent',
          count: dailyQuotations,
          timestamp: date.clone().add(Math.random() * 24, 'hours').toDate(),
          isProcessed: false
        });
      }
      
      if (dailyAccepted > 0) {
        activityLogs.push({
          productId,
          userId: null,
          activityType: 'accepted',
          count: dailyAccepted,
          timestamp: date.clone().add(Math.random() * 24, 'hours').toDate(),
          isProcessed: false
        });
      }
      
      if (dailyRejected > 0) {
        activityLogs.push({
          productId,
          userId: null,
          activityType: 'rejected',
          count: dailyRejected,
          timestamp: date.clone().add(Math.random() * 24, 'hours').toDate(),
          isProcessed: false
        });
      }
      
      if (dailyInProgress > 0) {
        activityLogs.push({
          productId,
          userId: null,
          activityType: 'in-progress',
          count: dailyInProgress,
          timestamp: date.clone().add(Math.random() * 24, 'hours').toDate(),
          isProcessed: false
        });
      }
    }
  }
  
  await ProductActivityLog.insertMany(activityLogs);
  
  console.log('✅ BULK PERFORMANCE DATA INSERTION COMPLETED!');
  console.log('📊 Summary:');
  console.log(`- Products: ${productIds.length}`);
  console.log(`- Monthly performance documents: ${monthlyDocs.length}`);
  console.log(`- Yearly performance documents: ${yearlyDocs.length}`);
  console.log(`- Activity logs: ${activityLogs.length}`);
  console.log(`- Date range: Jan 2023 - June 2024`);
  console.log(`- Performance profiles: Viral, Growing, Declining, Seasonal, Stable`);
  
  console.log('\n🎯 YOU CAN NOW TEST PERFORMANCE ANALYTICS WITH THESE DATE RANGES:');
  console.log('- Daily: Any range within Jan 2023 - June 2024');
  console.log('- Weekly: Any range within Jan 2023 - June 2024');
  console.log('- Monthly: Jan 2023 - June 2024');
  console.log('- Yearly: 2023, 2024');
  
  console.log('\n📈 PERFORMANCE METRICS GENERATED:');
  console.log('- View counts: 10-2000+ per month (based on profile)');
  console.log('- Quotations sent: 1-50+ per month');
  console.log('- Quotations accepted: 0-25+ per month');
  console.log('- Popularity scores: Calculated as viewCount + (quotationsSent * 5)');
  console.log('- Bestseller scores: Based on accepted quotations');
  
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
}

insertBulkPerformanceData().catch(console.error);