import mongoose from 'mongoose';
import { ProductMonthlyAnalytics, ProductYearlyAnalytics } from '../api/models/product-analytics.schema.js';
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

async function insertBulkAnalyticsData() {
  console.log('🗑️ Clearing existing data...');
  
  // Clear existing data for all products
  await ProductActivityLog.deleteMany({ productId: { $in: productIds } });
  await ProductMonthlyAnalytics.deleteMany({ productId: { $in: productIds } });
  await ProductYearlyAnalytics.deleteMany({ productId: { $in: productIds } });

  console.log('📊 Generating 18 months of analytics data...');

  // Define product performance profiles (some products perform better than others)
  const productProfiles = {
    '681cea709d0bb2a23d0b36d9': { multiplier: 1.5, trend: 'growing' },    // High performer, growing
    '681cea709d0bb2a23d0b36db': { multiplier: 1.2, trend: 'stable' },     // Good performer, stable
    '681cea709d0bb2a23d0b36dc': { multiplier: 0.8, trend: 'declining' },  // Declining performance
    '681cea709d0bb2a23d0b36dd': { multiplier: 1.0, trend: 'seasonal' },   // Seasonal peaks
    '681cea709d0bb2a23d0b36de': { multiplier: 1.3, trend: 'growing' },    // Growing fast
    '681cea709d0bb2a23d0b36df': { multiplier: 0.6, trend: 'stable' },     // Low but steady
    '681cea709d0bb2a23d0b36e0': { multiplier: 1.1, trend: 'growing' },    // Modest growth
    '681cea709d0bb2a23d0b36e1': { multiplier: 0.9, trend: 'declining' },  // Slight decline
    '681cea709d0bb2a23d0b36e2': { multiplier: 1.4, trend: 'seasonal' },   // Strong seasonal
    '681cea709d0bb2a23d0b36e6': { multiplier: 1.0, trend: 'stable' }      // Average performance
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
      
      // Base sales that vary by month (seasonal patterns)
      let baseSales = 15; // Base monthly sales
      
      // Seasonal adjustments
      if ([11, 12, 1].includes(month)) baseSales *= 1.4; // Holiday season boost
      if ([6, 7, 8].includes(month)) baseSales *= 1.2;   // Summer boost  
      if ([2, 3].includes(month)) baseSales *= 0.8;      // Winter slowdown
      
      // Apply product profile
      baseSales = Math.round(baseSales * profile.multiplier);
      
      // Apply trend over time
      const monthIndex = i;
      switch (profile.trend) {
        case 'growing':
          baseSales = Math.round(baseSales * (1 + monthIndex * 0.05)); // 5% growth per month
          break;
        case 'declining':
          baseSales = Math.round(baseSales * (1 - monthIndex * 0.02)); // 2% decline per month
          break;
        case 'seasonal':
          const seasonalBoost = Math.sin((monthIndex * Math.PI) / 6) * 0.3; // Sine wave
          baseSales = Math.round(baseSales * (1 + seasonalBoost));
          break;
        // stable = no change
      }
      
      // Ensure minimum 1 sale
      baseSales = Math.max(1, baseSales);
      
      const salesAmount = baseSales * (Math.random() * 50 + 100); // $100-150 per sale
      const profit = salesAmount * (Math.random() * 0.2 + 0.15);  // 15-35% profit margin

      // Generate daily metrics (distribute monthly sales across days)
      const daysInMonth = moment({ year, month: month - 1 }).daysInMonth();
      const dailyMetrics = new Array(31).fill(null);
      
      let remainingSales = baseSales;
      for (let day = 1; day <= daysInMonth && remainingSales > 0; day++) {
        if (Math.random() > 0.2) { // 80% chance of sales on any day
          const dailySales = Math.min(remainingSales, Math.floor(Math.random() * 3) + 1);
          if (dailySales > 0) {
            dailyMetrics[day - 1] = {
              day,
              salesCount: dailySales,
              salesAmount: Math.round(salesAmount * (dailySales / baseSales)),
              profit: Math.round(profit * (dailySales / baseSales))
            };
            remainingSales -= dailySales;
          }
        }
      }

      // Create monthly document
      const monthlyDoc = {
        productId,
        year,
        month,
        dailyMetrics,
        weeklyMetrics: [
          {
            week: moment({ year, month: month - 1 }).week(),
            salesCount: baseSales,
            salesAmount: Math.round(salesAmount),
            profit: Math.round(profit)
          }
        ],
        monthlyTotals: {
          salesCount: baseSales,
          salesAmount: Math.round(salesAmount),
          profit: Math.round(profit)
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
          yearlyTotals: { salesCount: 0, salesAmount: 0, profit: 0 }
        };
      }

      const yearlyDoc = yearlyData[yearKey];
      yearlyDoc.monthlyMetrics[month - 1] = {
        month,
        salesCount: baseSales,
        salesAmount: Math.round(salesAmount),
        profit: Math.round(profit)
      };

      yearlyDoc.yearlyTotals.salesCount += baseSales;
      yearlyDoc.yearlyTotals.salesAmount += Math.round(salesAmount);
      yearlyDoc.yearlyTotals.profit += Math.round(profit);
    }
  }

  // Insert monthly documents
  console.log(`📊 Inserting ${monthlyDocs.length} monthly documents...`);
  await ProductMonthlyAnalytics.insertMany(monthlyDocs);

  // Insert yearly documents
  const yearlyDocs = Object.values(yearlyData);
  console.log(`📊 Inserting ${yearlyDocs.length} yearly documents...`);
  await ProductYearlyAnalytics.insertMany(yearlyDocs);

  // Generate some recent activity logs for batch processing tests
  console.log('📝 Generating recent activity logs...');
  const activityLogs = [];
  const today = moment();

  for (let i = 1; i <= 7; i++) { // Last 7 days
    const date = today.clone().subtract(i, 'days');
    
    for (const productId of productIds) {
      const profile = productProfiles[productId];
      const dailySales = Math.floor(Math.random() * 3 * profile.multiplier) + 1;
      
      for (let j = 0; j < dailySales; j++) {
        activityLogs.push({
          productId,
          userId: null,
          activityType: 'sold',
          saleAmount: Math.floor(Math.random() * 200) + 100,
          profit: Math.floor(Math.random() * 60) + 20,
          timestamp: date.add(Math.random() * 24, 'hours').toDate(),
          isProcessed: false
        });
      }
    }
  }

  await ProductActivityLog.insertMany(activityLogs);

  console.log('✅ BULK DATA INSERTION COMPLETED!');
  console.log('📊 Summary:');
  console.log(`- Products: ${productIds.length}`);
  console.log(`- Monthly documents: ${monthlyDocs.length}`);
  console.log(`- Yearly documents: ${yearlyDocs.length}`);
  console.log(`- Activity logs: ${activityLogs.length}`);
  console.log(`- Date range: Jan 2023 - June 2024`);
  console.log(`- Performance profiles: High, Medium, Low performers with different trends`);
  
  console.log('\n🎯 YOU CAN NOW TEST WITH THESE DATE RANGES:');
  console.log('- Daily: Any range within Jan 2023 - June 2024');
  console.log('- Weekly: Any range within Jan 2023 - June 2024'); 
  console.log('- Monthly: Jan 2023 - June 2024');
  console.log('- Yearly: 2023, 2024');
  
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
}

insertBulkAnalyticsData().catch(console.error);