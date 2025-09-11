import mongoose from 'mongoose';

const DailyMetricsSchema = new mongoose.Schema({
  day: { type: Number, required: true }, // 1-31
  salesCount: { type: Number, default: 0 },          // Services completed/sold
  salesAmount: { type: Number, default: 0 },         // Revenue earned
  profit: { type: Number, default: 0 },              // Profit after costs
  avgRating: { type: Number, default: 0 },           // Average service rating
  completionRate: { type: Number, default: 0 }       // % of services completed on time
}, { _id: false });

const WeeklyMetricsSchema = new mongoose.Schema({
  week: { type: Number, required: true }, 
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 }
}, { _id: false });

const MonthlyMetricsSchema = new mongoose.Schema({
  month: { type: Number, required: true },
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 }
}, { _id: false });

const ServiceMonthlyAnalyticsSchema = new mongoose.Schema({
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
  
  // Arrays of ONLY sales data
  dailyMetrics: [DailyMetricsSchema],    // Max 31 elements
  weeklyMetrics: [WeeklyMetricsSchema],  // Max 6 elements per month
  
  // Monthly totals - ONLY sales data
  monthlyTotals: {
    salesCount: { type: Number, default: 0 },
    salesAmount: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ServiceMonthlyAnalytics'
});

// Compound indices for efficient querying
ServiceMonthlyAnalyticsSchema.index({ 
  serviceId: 1, 
  year: 1, 
  month: 1 
}, { unique: true });

ServiceMonthlyAnalyticsSchema.index({ year: 1, month: 1 });
ServiceMonthlyAnalyticsSchema.index({ serviceId: 1, year: 1 });

// =============================================================================
// YEARLY ANALYTICS - ONLY SALES DATA
// =============================================================================
const ServiceYearlyAnalyticsSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Types.ObjectId,
    ref: 'Service',
    index: true
  }, // null = all services combined
  
  year: {
    type: Number,
    required: true,
    index: true
  },
  
  // Array of monthly metrics - ONLY sales data
  monthlyMetrics: [MonthlyMetricsSchema], // Max 12 elements
  
  // Yearly totals - ONLY sales data
  yearlyTotals: {
    salesCount: { type: Number, default: 0 },
    salesAmount: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ServiceYearlyAnalytics'
});

ServiceYearlyAnalyticsSchema.index({ 
  serviceId: 1, 
  year: 1 
}, { unique: true });

ServiceYearlyAnalyticsSchema.index({ year: 1 });

export const ServiceMonthlyAnalytics = mongoose.model('ServiceMonthlyAnalytics', ServiceMonthlyAnalyticsSchema);
export const ServiceYearlyAnalytics = mongoose.model('ServiceYearlyAnalytics', ServiceYearlyAnalyticsSchema);