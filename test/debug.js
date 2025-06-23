console.log('Testing imports...');

try {
  console.log('1. Testing moment import...');
  const moment = await import('moment');
  console.log('✅ Moment imported');

  console.log('2. Testing models import...');
  const models = await import('../models/productAnalytics.js');
  console.log('✅ Models imported:', Object.keys(models));

  console.log('3. Testing batch processing import...');
  const batch = await import('../analytics/batchProcessing.js');
  console.log('✅ Batch imported:', Object.keys(batch));

  console.log('🎉 All imports successful!');
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Full error:', error);
}
