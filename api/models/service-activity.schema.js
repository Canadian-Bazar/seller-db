import mongoose from 'mongoose';

const ServiceActivityLogSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },
  
  sellerId: {
    type: mongoose.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  
  buyerId: {
    type: mongoose.Types.ObjectId,
    ref: 'Buyer',
    index: true
  },
  
  activityType: {
    type: String,
    required: true,
    enum: [
      'viewed',              // Service page viewed
      'quote_requested',     // Quote request initiated
      'quote_sent',         // Quote sent to buyer
      'quote_accepted',     // Quote accepted by buyer
      'quote_rejected',     // Quote rejected by buyer
      'service_started',    // Service work started
      'service_completed',  // Service completed/sold
      'service_reviewed'    // Service reviewed by buyer
    ],
    index: true
  },
  
  // Financial data (for completed services)
  serviceAmount: {
    type: Number,
    default: 0
  },
  
  profit: {
    type: Number,
    default: 0
  },
  
  // Performance data
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  responseTime: {
    type: Number, // Response time in hours
    default: 0
  },
  
  // Additional metadata
  quotationId: {
    type: mongoose.Types.ObjectId,
    ref: 'ServiceQuotation'
  },
  
  orderId: {
    type: mongoose.Types.ObjectId,
    ref: 'ServiceOrder'
  },
  
  reviewId: {
    type: mongoose.Types.ObjectId,
    ref: 'ServiceReview'
  },
  
  // Processing status for batch jobs
  isProcessed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Additional context data
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: String, // 'web', 'mobile', 'api'
    sessionId: String
  }
}, {
  timestamps: true,
  collection: 'ServiceActivityLogs'
});

// Compound indices for efficient querying
ServiceActivityLogSchema.index({ serviceId: 1, timestamp: 1 });
ServiceActivityLogSchema.index({ sellerId: 1, timestamp: 1 });
ServiceActivityLogSchema.index({ activityType: 1, timestamp: 1 });
ServiceActivityLogSchema.index({ isProcessed: 1, timestamp: 1 });
ServiceActivityLogSchema.index({ serviceId: 1, activityType: 1, timestamp: 1 });

// TTL index to automatically delete old processed logs (90 days)
ServiceActivityLogSchema.index({ timestamp: 1 }, { 
  expireAfterSeconds: 90 * 24 * 60 * 60,
  partialFilterExpression: { isProcessed: true }
});

export default mongoose.model('ServiceActivityLog', ServiceActivityLogSchema);