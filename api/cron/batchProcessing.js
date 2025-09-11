import runProductAnalyticsBatch from '../batches/product-analytics.batch.js';
import runServiceAnalyticsBatch from '../batches/service-analytics.batch.js';

export const runBatchJob = async (jobType, date) => {
  switch (jobType) {
    case 'daily_aggregation':
      console.log('Running daily analytics aggregation for both products and services...');
      await Promise.all([
        runProductAnalyticsBatch(date),
        runServiceAnalyticsBatch(date)
      ]);
      break;
      
    case 'monthly_aggregation':
      console.log('Running monthly analytics aggregation for both products and services...');
      await Promise.all([
        runProductAnalyticsBatch(date, 'monthly'),
        runServiceAnalyticsBatch(date, 'monthly')
      ]);
      break;
      
    case 'cleanup':
      console.log('Running cleanup tasks...');
      // Add cleanup logic if needed
      break;
      
    default:
      console.warn(`Unknown batch job type: ${jobType}`);
  }
};

export default {
  runBatchJob
};