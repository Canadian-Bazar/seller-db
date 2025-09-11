import { redisClient } from '../redis/redis.config.js'
import { ProductMonthlyPerformance } from '../models/product-performance-analytics.schema.js'
import { ServiceMonthlyPerformance } from '../models/service-performance-analytics.schema.js'
import { ANALYTICS_QUEUE } from '../redis/unifiedAnalyticsQueue.js'

/**
 * Unified Analytics Batch Processor
 * Handles quotationsSent, quotationsAccepted, quotationsRejected, quotationsInProgress
 * For both Products and Services
 */
export class UnifiedAnalyticsBatchProcessor {
  constructor() {
    this.batchSize = 100
    this.processingInterval = 30000 // 30 seconds
    this.isProcessing = false
  }

  /**
   * Process a batch of analytics updates
   */
  async processBatch() {
    if (this.isProcessing) {
      console.log('⏳ Batch already processing, skipping...')
      return
    }

    this.isProcessing = true

    try {
      const items = await redisClient.rpop(ANALYTICS_QUEUE, this.batchSize)
      
      if (!items || items.length === 0) {
        return
      }

      console.log(`📊 Processing ${items.length} analytics updates`)

      // Group by itemId and date for efficient bulk updates
      const groupedUpdates = this.groupUpdatesByItem(items)
      
      // Process each item's updates in single transaction
      for (const [itemKey, itemData] of Object.entries(groupedUpdates)) {
        await this.processBulkItemUpdates(itemKey, itemData)
      }

      console.log(`✅ Completed batch processing: ${items.length} updates`)

    } catch (error) {
      console.error('❌ Error processing analytics batch:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Group updates by itemId and date for efficient processing
   */
  groupUpdatesByItem(items) {
    const grouped = {}
    
    items.forEach(item => {
      const data = JSON.parse(item)
      const key = `${data.itemId}_${data.isService ? 'service' : 'product'}`
      
      if (!grouped[key]) {
        grouped[key] = {
          itemId: data.itemId,
          isService: data.isService,
          updates: {}
        }
      }
      
      const dateKey = new Date(data.timestamp).toDateString()
      if (!grouped[key].updates[dateKey]) {
        grouped[key].updates[dateKey] = {
          quotationsSent: 0,
          quotationsAccepted: 0,
          quotationsRejected: 0,
          quotationsInProgress: 0
        }
      }
      
      // Aggregate updates based on event type
      switch(data.type) {
        case 'QUOTATION_SENT':
          grouped[key].updates[dateKey].quotationsSent += 1
          break
        case 'QUOTATION_ACCEPTED':
          grouped[key].updates[dateKey].quotationsAccepted += 1
          grouped[key].updates[dateKey].quotationsInProgress -= 1
          break
        case 'QUOTATION_REJECTED':
          grouped[key].updates[dateKey].quotationsRejected += 1
          grouped[key].updates[dateKey].quotationsInProgress -= 1
          break
        case 'QUOTATION_IN_PROGRESS':
          grouped[key].updates[dateKey].quotationsInProgress += 1
          break
      }
    })
    
    return grouped
  }

  /**
   * Process bulk updates for a specific item (product or service)
   */
  async processBulkItemUpdates(itemKey, groupedData) {
    const { itemId, isService, updates } = groupedData
    const Model = isService ? ServiceMonthlyPerformance : ProductMonthlyPerformance
    const idField = isService ? 'serviceId' : 'productId'
    
    for (const [dateStr, metrics] of Object.entries(updates)) {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      
      try {
        // Build update operations
        const monthlyInc = {}
        const dailyInc = {}
        
        if (metrics.quotationsSent > 0) {
          monthlyInc['monthlyTotals.quotationsSent'] = metrics.quotationsSent
        }
        if (metrics.quotationsAccepted > 0) {
          monthlyInc['monthlyTotals.quotationsAccepted'] = metrics.quotationsAccepted
        }
        if (metrics.quotationsRejected > 0) {
          monthlyInc['monthlyTotals.quotationsRejected'] = metrics.quotationsRejected
        }
        if (metrics.quotationsInProgress !== 0) {
          monthlyInc['monthlyTotals.quotationsInProgress'] = metrics.quotationsInProgress
        }

        // Find existing document or create new one
        let document = await Model.findOneAndUpdate(
          { [idField]: itemId, year, month },
          { 
            $inc: monthlyInc,
            $setOnInsert: {
              [idField]: itemId,
              year,
              month,
              dailyMetrics: Array.from({ length: 31 }, (_, i) => ({
                day: i + 1,
                quotationsSent: 0,
                quotationsAccepted: 0,
                quotationsRejected: 0,
                quotationsInProgress: 0,
                viewCount: 0,
                popularityScore: 0,
                ...(isService ? { responseTime: 0 } : { bestsellerScore: 0 })
              }))
            }
          },
          { upsert: true, new: true }
        )

        // Update daily metrics for the specific day
        if (document && day >= 1 && day <= 31) {
          const dailyUpdate = {}
          if (metrics.quotationsSent > 0) {
            dailyUpdate[`dailyMetrics.${day-1}.quotationsSent`] = metrics.quotationsSent
          }
          if (metrics.quotationsAccepted > 0) {
            dailyUpdate[`dailyMetrics.${day-1}.quotationsAccepted`] = metrics.quotationsAccepted
          }
          if (metrics.quotationsRejected > 0) {
            dailyUpdate[`dailyMetrics.${day-1}.quotationsRejected`] = metrics.quotationsRejected
          }
          if (metrics.quotationsInProgress !== 0) {
            dailyUpdate[`dailyMetrics.${day-1}.quotationsInProgress`] = metrics.quotationsInProgress
          }

          if (Object.keys(dailyUpdate).length > 0) {
            await Model.findByIdAndUpdate(document._id, { $inc: dailyUpdate })
          }
        }
        
        console.log(`📊 Updated ${isService ? 'SERVICE' : 'PRODUCT'} analytics: ${itemId} (${year}-${month}-${day})`)
        
      } catch (error) {
        console.error(`❌ Error updating analytics for ${itemKey}:`, error)
      }
    }
  }

  /**
   * Start the batch processor
   */
  startProcessing() {
    setInterval(() => {
      this.processBatch()
    }, this.processingInterval)
    
    console.log(`📊 Unified Analytics Batch Processor started (${this.processingInterval/1000}s intervals)`)
  }

  /**
   * Stop the batch processor  
   */
  stopProcessing() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      console.log('📊 Analytics batch processor stopped')
    }
  }
}

export default UnifiedAnalyticsBatchProcessor