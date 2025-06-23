import mongoose from 'mongoose'


const ProductActivityLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Types.ObjectId,
    index: true
  },
  activityType: {
    type: String,
    enum: ['view', 'sent', 'accepted', 'rejected', 'in-progress', 'sold'],
    required: true,
    index: true
  },
  quotationId: {
    type: mongoose.Types.ObjectId,
    ref: 'Quotation',
    sparse: true
  },
  saleAmount: {
    type: Number,
    sparse: true 
  },
  profit: {
    type: Number,
    sparse: true 
  },
  isProcessed: {
    type: Boolean,
    default: false,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'ProductActivityLog'
});




const DailyMetricsSchema = new mongoose.Schema({
  day: { type: Number, required: true }, // 1-31
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  quotationsSent: { type: Number, default: 0 },
  quotationsAccepted: { type: Number, default: 0 },
  quotationsRejected: { type: Number, default: 0 },
  quotationsInProgress: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 },
  bestsellerScore: { type: Number, default: 0 }
}, { _id: false });

// Weekly metrics subdocument
const WeeklyMetricsSchema = new mongoose.Schema({
  week: { type: Number, required: true }, // 1-53 (week of year)
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  quotationsSent: { type: Number, default: 0 },
  quotationsAccepted: { type: Number, default: 0 },
  quotationsRejected: { type: Number, default: 0 },
  quotationsInProgress: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 },
  bestsellerScore: { type: Number, default: 0 }
}, { _id: false });

const MonthlyMetricsSchema = new mongoose.Schema({
  month: { type: Number, required: true }, 
  salesCount: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  quotationsSent: { type: Number, default: 0 },
  quotationsAccepted: { type: Number, default: 0 },
  quotationsRejected: { type: Number, default: 0 },
  quotationsInProgress: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 },
  bestsellerScore: { type: Number, default: 0 }
}, { _id: false });


export default mongoose.model('ProductActivityLog', ProductActivityLogSchema);