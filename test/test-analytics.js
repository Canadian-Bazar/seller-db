import { runCompleteTest } from "./testingSuite.js";
import mongoose from "mongoose";

// =============================================================================
// CONNECT TO MONGODB
// =============================================================================

async function connectDB() {
  try {
    const mongoURI = 'mongodb+srv://devmishrayash:Lo7XBBFhFGGXNh9E@canadianbazaar.jry947b.mongodb.net/CanadianBazaar?retryWrites=true&w=majority&appName=CanadianBazaar';
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// =============================================================================
// MAIN TEST FUNCTION
// =============================================================================

async function testAnalytics() {
  const testProductIds = [
    '681cea709d0bb2a23d0b36d9',
    '681cea709d0bb2a23d0b36db', 
    '681cea709d0bb2a23d0b36dc'
  ];

  console.log('🧪 Starting Analytics System Test');
  console.log('================================');

  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Run the complete test suite
    const results = await runCompleteTest(testProductIds);
    
    console.log('\n📋 FINAL TEST RESULTS:');
    console.log('=====================');
    
    if (results.errors.length === 0) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('\n📊 What was tested:');
      console.log('- ✅ Sales data generation');
      console.log('- ✅ Daily batch processing'); 
      console.log('- ✅ Monthly batch processing');
      console.log('- ✅ MongoDB document creation');
      
      console.log('\n🎯 Your analytics system is working correctly!');
      console.log('You can now:');
      console.log('1. Set up cron jobs for automatic processing');
      console.log('2. Create frontend API endpoints');
      console.log('3. Start tracking real sales data');
      
    } else {
      console.log('❌ SOME TESTS FAILED:');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Show generated data info
    if (results.step1_dataGeneration) {
      console.log(`\n📊 Generated ${results.step1_dataGeneration.length} test sales records`);
    }

    // Show batch processing results
    if (results.step2_batchProcessing) {
      console.log('\n⚙️ Batch Processing Results:');
      console.log(`- Daily aggregations: ${results.step2_batchProcessing.dailyResults.length} successful`);
      console.log(`- Monthly aggregations: ${results.step2_batchProcessing.monthlyResults.length} successful`);
      console.log(`- Processing errors: ${results.step2_batchProcessing.errors.length}`);
      
      if (results.step2_batchProcessing.errors.length > 0) {
        console.log('Processing Errors:');
        results.step2_batchProcessing.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.type}: ${error.error}`);
        });
      }
    }

  } catch (error) {
    console.error('💥 TEST RUNNER FAILED:', error);
  } finally {
    // Always close the connection
    try {
      await mongoose.connection.close();
      console.log('\n✅ MongoDB connection closed');
    } catch (closeError) {
      console.error('❌ Error closing MongoDB connection:', closeError);
    }
    
    // Exit the process
    process.exit(0);
  }
}

// =============================================================================
// RUN THE TEST
// =============================================================================

testAnalytics().catch((error) => {
  console.error('💥 FATAL ERROR:', error);
  process.exit(1);
});

// =============================================================================
// MANUAL TESTING FUNCTIONS (uncomment to use individually)
// =============================================================================

/*
// Test 1: Just generate test data
import { generateTestSalesData } from './testingSuite.js';

async function testDataGeneration() {
  await connectDB();
  
  const testData = await generateTestSalesData({
    productIds: ['681cea709d0bb2a23d0b36d9', '681cea709d0bb2a23d0b36db'],
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-10'),
    salesPerDay: { min: 1, max: 3 }
  });
  
  console.log('Generated:', testData.length, 'sales records');
  await mongoose.connection.close();
}

// Uncomment and run: testDataGeneration();
*/

/*
// Test 2: Just run batch processing for specific date
import { runDailyAggregation } from '../api/batches/product-analytics.batch.js';

async function testBatchProcessing() {
  await connectDB();
  
  const result = await runDailyAggregation(new Date('2024-06-15'));
  console.log('Batch result:', result);
  
  await mongoose.connection.close();
}

// Uncomment and run: testBatchProcessing();
*/

/*
// Test 3: Clear all test data
import { ProductActivityLog, ProductMonthlyAnalytics, ProductYearlyAnalytics } from '../api/models/product-analytics.schema.js';

async function clearTestData() {
  await connectDB();
  
  const productIds = ['681cea709d0bb2a23d0b36d9', '681cea709d0bb2a23d0b36db', '681cea709d0bb2a23d0b36dc'];
  
  const deletedLogs = await ProductActivityLog.deleteMany({ productId: { $in: productIds } });
  const deletedMonthly = await ProductMonthlyAnalytics.deleteMany({ productId: { $in: productIds } });
  const deletedYearly = await ProductYearlyAnalytics.deleteMany({ productId: { $in: productIds } });
  
  console.log(`Cleared: ${deletedLogs.deletedCount} logs, ${deletedMonthly.deletedCount} monthly, ${deletedYearly.deletedCount} yearly`);
  
  await mongoose.connection.close();
}

// Uncomment and run: clearTestData();
*/