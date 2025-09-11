import { redisClient } from './redis.config.js'
import { queueAnalyticsUpdate } from './unifiedAnalyticsQueue.js'

/**
 * Redis subscriber for quotation analytics events from buyer-db
 * Listens to quotation creation and status changes
 */

export const QUOTATION_EVENTS_CHANNEL = 'quotation-analytics-events'

/**
 * Handle incoming quotation analytics events
 */
const handleQuotationAnalyticsEvent = async (message) => {
  try {
    const event = JSON.parse(message)
    
    console.log(`📥 Received quotation event: ${event.type} - ${event.isService ? 'SERVICE' : 'PRODUCT'}`)
    
    switch (event.type) {
      case 'QUOTATION_SENT':
        await handleQuotationSent(event)
        break
        
      case 'QUOTATION_REJECTED':
        await handleQuotationStatusChange(event, 'REJECTED')
        break
        
      case 'QUOTATION_NEGOTIATION':  
        await handleQuotationStatusChange(event, 'IN_PROGRESS')
        break
        
      case 'QUOTATION_ACCEPTED':
        await handleQuotationStatusChange(event, 'ACCEPTED') 
        break
        
      default:
        console.warn(`⚠️ Unknown quotation event type: ${event.type}`)
    }
    
  } catch (error) {
    console.error('❌ Error processing quotation analytics event:', error)
  }
}

/**
 * Handle quotation sent event - increment quotationsSent
 */
const handleQuotationSent = async (event) => {
  const itemId = event.isService ? event.serviceId : event.productId
  
  await queueAnalyticsUpdate({
    type: 'QUOTATION_SENT',
    itemId: itemId,
    quotationId: event.quotationId,
    sellerId: event.sellerId,
    isService: event.isService,
    timestamp: event.timestamp
  })
  
  console.log(`📊 Queued QUOTATION_SENT analytics: ${event.isService ? 'SERVICE' : 'PRODUCT'} - ${itemId}`)
}

/**
 * Handle quotation status change events
 */
const handleQuotationStatusChange = async (event, status) => {
  const itemId = event.isService ? event.serviceId : event.productId
  
  await queueAnalyticsUpdate({
    type: `QUOTATION_${status}`,
    itemId: itemId,
    quotationId: event.quotationId,
    sellerId: event.sellerId,
    isService: event.isService,
    timestamp: event.timestamp
  })
  
  console.log(`📊 Queued QUOTATION_${status} analytics: ${event.isService ? 'SERVICE' : 'PRODUCT'} - ${itemId}`)
}

/**
 * Start the quotation analytics subscriber
 */
export const startQuotationAnalyticsSubscriber = async () => {
  try {
    // Create a separate Redis client for subscription
    const subscriber = redisClient.duplicate()
    
    // Subscribe to quotation analytics events channel
    await subscriber.subscribe(QUOTATION_EVENTS_CHANNEL)
    
    // Handle incoming messages
    subscriber.on('message', (channel, message) => {
      if (channel === QUOTATION_EVENTS_CHANNEL) {
        handleQuotationAnalyticsEvent(message)
      }
    })
    
    // Handle connection events
    subscriber.on('subscribe', (channel, count) => {
      console.log(`✅ Subscribed to quotation analytics channel: ${channel}`)
    })
    
    subscriber.on('error', (error) => {
      console.error('❌ Quotation analytics subscriber error:', error)
    })
    
    console.log('🎯 Quotation analytics subscriber started successfully')
    
    return subscriber
  } catch (error) {
    console.error('❌ Failed to start quotation analytics subscriber:', error)
    throw error
  }
}

export default {
  startQuotationAnalyticsSubscriber,
  QUOTATION_EVENTS_CHANNEL
}