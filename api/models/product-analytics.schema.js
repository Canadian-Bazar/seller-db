import mongoose from 'mongoose';

const DailyMetricsSchema = new mongoose.Schema({
  day: { type: Number, required: true }, // 1-31
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 }
}, { _id: false });

const WeeklyMetricsSchema = new mongoose.Schema({
  week: { type: Number, required: true }, 
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 }
}, { _id: false });

const MonthlyMetricsSchema = new mongoose.Schema({
  month: { type: Number, required: true },
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 }
}, { _id: false });

const ProductMonthlyAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Types.ObjectId,
    ref: 'Product',
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
    profit: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ProductMonthlyAnalytics'
});

// Compound indices for efficient querying
ProductMonthlyAnalyticsSchema.index({ 
  productId: 1, 
  year: 1, 
  month: 1 
}, { unique: true });

ProductMonthlyAnalyticsSchema.index({ year: 1, month: 1 });
ProductMonthlyAnalyticsSchema.index({ productId: 1, year: 1 });

// =============================================================================
// YEARLY ANALYTICS - ONLY SALES DATA
// =============================================================================
const ProductYearlyAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Types.ObjectId,
    ref: 'Product',
    index: true
  }, // null = all products combined
  
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
    profit: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ProductYearlyAnalytics'
});

ProductYearlyAnalyticsSchema.index({ 
  productId: 1, 
  year: 1 
}, { unique: true });

ProductYearlyAnalyticsSchema.index({ year: 1 });

export const ProductMonthlyAnalytics = mongoose.model('ProductMonthlyAnalytics', ProductMonthlyAnalyticsSchema);
export const ProductYearlyAnalytics = mongoose.model('ProductYearlyAnalytics', ProductYearlyAnalyticsSchema);