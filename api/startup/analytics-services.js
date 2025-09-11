import { startQuotationAnalyticsSubscriber } from '../redis/quotation-analytics-subscriber.js'
import { startPaymentEventsSubscriber } from '../redis/unifiedAnalyticsQueue.js'
import UnifiedAnalyticsBatchProcessor from '../batches/unified-analytics-processor.js'

/**
 * Initialize all analytics services
 * - Redis subscribers for quotation events
 * - Redis subscriber for payment events  
 * - Batch processor for analytics updates
 */

let analyticsServices = {}

export const initializeAnalyticsServices = async () => {
  try {
    console.log('🚀 Starting Analytics Services...')
    
    // 1. Start quotation analytics subscriber (from buyer-db)
    const quotationSubscriber = await startQuotationAnalyticsSubscriber()
    analyticsServices.quotationSubscriber = quotationSubscriber
    
    // 2. Start payment events subscriber (from payment-db)  
    const paymentSubscriber = await startPaymentEventsSubscriber()
    analyticsServices.paymentSubscriber = paymentSubscriber
    
    // 3. Start unified analytics batch processor
    const batchProcessor = new UnifiedAnalyticsBatchProcessor()
    batchProcessor.startProcessing()
    analyticsServices.batchProcessor = batchProcessor
    
    console.log('✅ All Analytics Services Started Successfully!')
    console.log('📊 Now tracking: quotationsSent, quotationsAccepted, quotationsRejected, quotationsInProgress')
    console.log('🔄 For both Products and Services via Redis pub/sub')
    
    return analyticsServices
    
  } catch (error) {
    console.error('❌ Failed to initialize analytics services:', error)
    throw error
  }
}

/**
 * Gracefully shutdown analytics services
 */
export const shutdownAnalyticsServices = async () => {
  try {
    console.log('🛑 Shutting down analytics services...')
    
    if (analyticsServices.quotationSubscriber) {
      analyticsServices.quotationSubscriber.unsubscribe()
      analyticsServices.quotationSubscriber.disconnect()
    }
    
    if (analyticsServices.paymentSubscriber) {
      analyticsServices.paymentSubscriber.unsubscribe() 
      analyticsServices.paymentSubscriber.disconnect()
    }
    
    if (analyticsServices.batchProcessor) {
      analyticsServices.batchProcessor.stopProcessing()
    }
    
    console.log('✅ Analytics services shut down successfully')
    
  } catch (error) {
    console.error('❌ Error shutting down analytics services:', error)
  }
}

// Handle process termination
process.on('SIGINT', shutdownAnalyticsServices)
process.on('SIGTERM', shutdownAnalyticsServices)

export default {
  initializeAnalyticsServices,
  shutdownAnalyticsServices
}