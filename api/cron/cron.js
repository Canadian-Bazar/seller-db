import cron from 'node-cron';
import moment from 'moment';
import { runBatchJob } from './batchProcessing.js';



export function startAnalyticsCronJobs() {
  console.log('🚀 Starting analytics cron jobs...');
  
  cron.schedule('0 1 * * *', async () => {
    console.log('📊 Running daily analytics aggregation...');
    try {
      const yesterday = moment().subtract(1, 'day').toDate();
      await runBatchJob('daily_aggregation', yesterday);
      console.log('✅ Daily aggregation completed');
    } catch (error) {
      console.error('❌ Daily aggregation failed:', error);
    }
  });

  cron.schedule('0 2 1 * *', async () => {
    console.log('📊 Running monthly analytics aggregation...');
    try {
      const lastMonth = moment().subtract(1, 'month').toDate();
      await runBatchJob('monthly_aggregation', lastMonth);
      console.log('✅ Monthly aggregation completed');
    } catch (error) {
      console.error('❌ Monthly aggregation failed:', error);
    }
  });

  cron.schedule('0 3 * * 0', async () => {
    console.log('🧹 Running analytics cleanup...');
    try {
      await runBatchJob('cleanup');
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  });

  console.log('✅ Analytics cron jobs started successfully');
}

export default {
  startAnalyticsCronJobs
};