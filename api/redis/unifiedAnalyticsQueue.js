import { redisClient } from './redis.config.js'

export const ANALYTICS_QUEUE = 'analytics:updates'

/**
 * Queue analytics updates for batch processing
 */
export const queueAnalyticsUpdate = async (updateData) => {
  const timestamp = Date.now()
  const queueItem = {
    ...updateData,
    timestamp,
    id: `${updateData.type}_${updateData.itemId}_${timestamp}`
  }
  
  await redisClient.lpush(ANALYTICS_QUEUE, JSON.stringify(queueItem))
  console.log(`🔄 Queued analytics update: ${updateData.type} - ${updateData.isService ? 'SERVICE' : 'PRODUCT'}`)
}

/**
 * Handle payment events from payment-db webhook
 */
export const handlePaymentEvents = async (message) => {
  const event = JSON.parse(message)
  
  switch(event.type) {
    case 'ORDER_CREATED':
      await queueAnalyticsUpdate({
        type: 'QUOTATION_ACCEPTED',
        itemId: event.productId,
        quotationId: event.quotationId,
        sellerId: event.sellerId,
        isService: false,
        timestamp: event.timestamp
      })
      break
      
    case 'SERVICE_ORDER_CREATED':
      await queueAnalyticsUpdate({
        type: 'QUOTATION_ACCEPTED', 
        itemId: event.serviceId,
        quotationId: event.serviceQuotationId,
        sellerId: event.sellerId,
        isService: true,
        timestamp: event.timestamp
      })
      break
  }
}

/**
 * Start payment events subscriber
 */
export const startPaymentEventsSubscriber = async () => {
  try {
    const subscriber = redisClient.duplicate()
    
    await subscriber.subscribe('payment-events')
    
    subscriber.on('message', (channel, message) => {
      if (channel === 'payment-events') {
        handlePaymentEvents(message)
      }
    })
    
    console.log('💳 Payment events subscriber started')
    
    return subscriber
  } catch (error) {
    console.error('❌ Failed to start payment events subscriber:', error)
    throw error
  }
}

export default {
  queueAnalyticsUpdate,
  handlePaymentEvents,
  startPaymentEventsSubscriber,
  ANALYTICS_QUEUE
}