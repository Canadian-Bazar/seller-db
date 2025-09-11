import mongoose from 'mongoose';

// Daily metrics subdocument for performance tracking
const DailyPerformanceMetricsSchema = new mongoose.Schema({
  day: { type: Number, required: true }, // 1-31
  viewCount: { type: Number, default: 0 },
  quotationsSent: { type: Number, default: 0 },
  quotationsAccepted: { type: Number, default: 0 },
  quotationsRejected: { type: Number, default: 0 },
  quotationsInProgress: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 } // Average response time in hours
}, { _id: false });

// Weekly metrics subdocument for performance tracking
const WeeklyPerformanceMetricsSchema = new mongoose.Schema({
  week: { type: Number, required: true }, // 1-53 (week of year)
  viewCount: { type: Number, default: 0 },
  quotationsSent: { type: Number, default: 0 },
  quotationsAccepted: { type: Number, default: 0 },
  quotationsRejected: { type: Number, default: 0 },
  quotationsInProgress: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 }
}, { _id: false });

// Monthly metrics subdocument for performance tracking
const MonthlyPerformanceMetricsSchema = new mongoose.Schema({
  month: { type: Number, required: true }, // 1-12
  viewCount: { type: Number, default: 0 },
  quotationsSent: { type: Number, default: 0 },
  quotationsAccepted: { type: Number, default: 0 },
  quotationsRejected: { type: Number, default: 0 },
  quotationsInProgress: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 }
}, { _id: false });

// =============================================================================
// MONTHLY PERFORMANCE ANALYTICS - ONLY PERFORMANCE DATA
// =============================================================================
const ServiceMonthlyPerformanceSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Types.ObjectId,
    ref: 'Service',
    index: true
  },
  
  year: {
    type: Number,
    required: true,
    index: true
  },
  
  month: {
    type: Number,
    required: true,
    index: true // 1-12
  },
  
  // Arrays of ONLY performance data
  dailyMetrics: [DailyPerformanceMetricsSchema],    // Max 31 elements
  weeklyMetrics: [WeeklyPerformanceMetricsSchema],  // Max 6 elements per month
  
  // Monthly totals - ONLY performance data
  monthlyTotals: {
    viewCount: { type: Number, default: 0 },
    quotationsSent: { type: Number, default: 0 },
    quotationsAccepted: { type: Number, default: 0 },
    quotationsRejected: { type: Number, default: 0 },
    quotationsInProgress: { type: Number, default: 0 },
    popularityScore: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ServiceMonthlyPerformance'
});

// Compound indices for efficient querying
ServiceMonthlyPerformanceSchema.index({ 
  serviceId: 1, 
  year: 1, 
  month: 1 
}, { unique: true });

ServiceMonthlyPerformanceSchema.index({ year: 1, month: 1 });
ServiceMonthlyPerformanceSchema.index({ serviceId: 1, year: 1 });

// =============================================================================
// YEARLY PERFORMANCE ANALYTICS - ONLY PERFORMANCE DATA
// =============================================================================
const ServiceYearlyPerformanceSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Types.ObjectId,
    ref: 'Service',
    index: true
  },
  
  year: {
    type: Number,
    required: true,
    index: true
  },
  
  // Array of monthly metrics - ONLY performance data
  monthlyMetrics: [MonthlyPerformanceMetricsSchema], // Max 12 elements
  
  // Yearly totals - ONLY performance data
  yearlyTotals: {
    viewCount: { type: Number, default: 0 },
    quotationsSent: { type: Number, default: 0 },
    quotationsAccepted: { type: Number, default: 0 },
    quotationsRejected: { type: Number, default: 0 },
    quotationsInProgress: { type: Number, default: 0 },
    popularityScore: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ServiceYearlyPerformance'
});

ServiceYearlyPerformanceSchema.index({ 
  serviceId: 1, 
  year: 1 
}, { unique: true });

ServiceYearlyPerformanceSchema.index({ year: 1 });

export const ServiceMonthlyPerformance = mongoose.model('ServiceMonthlyPerformance', ServiceMonthlyPerformanceSchema);
export const ServiceYearlyPerformance = mongoose.model('ServiceYearlyPerformance', ServiceYearlyPerformanceSchema);