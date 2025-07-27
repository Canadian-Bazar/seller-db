import mongoose from "mongoose";


const SubscriptionPlanVersionSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlanTemplate',
    required: true,
    index: true
  },
  versionNumber: { 
    type: Number, 
    required: true,
    min: 1
  },
  pricing: {
    monthly: { type: Number, min: 0 },
    quarterly: { type: Number, min: 0 },
    yearly: { type: Number, min: 0 }
  },
 
  features: {
    productListingPerMonth: { type: Number, min: 0 },
    videoPerProduct: { type: Number, min: 0 },
    featuredListingDaysPerMonth: { type: Number, min: 0 },
    incomingInquiryLimit: { type: Number, min: 0 },
    
    securePayment: { type: Boolean, default: false },
    newsLetterAndIndustryInsights: { type: Boolean, default: false },
    essentialSEOSupport: { type: Boolean, default: false },
    verifiedBadge: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    
    customFeatures: [{
      name: String,
      value: mongoose.Schema.Types.Mixed,
      type: {
        type: String,
        enum: ['boolean', 'number', 'string', 'array']
      }
    }]
  },
  isCurrent: { type: Boolean, default: true, index: true },
  isDeprecated: { type: Boolean, default: false, index: true },
  effectiveDate: { type: Date, default: Date.now },
  deprecationDate: Date,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalStatus: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft'
  },
  changeLog: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  collection: 'SubscriptionPlanVersion'
});

SubscriptionPlanVersionSchema.index({ templateId: 1, isCurrent: 1 });
SubscriptionPlanVersionSchema.index({ templateId: 1, versionNumber: -1 });

SubscriptionPlanVersionSchema.pre('save', async function(next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    await this.constructor.updateMany(
      { templateId: this.templateId, _id: { $ne: this._id } },
      { isCurrent: false }
    );
  }
  next();
});

export default mongoose.model('SubscriptionPlanVersion', SubscriptionPlanVersionSchema);
