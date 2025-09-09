import mongoose from "mongoose";

const WebsiteProjectSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  
  websiteQuotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebsiteQuotation',
    required: true,
    index: true
  },
  
  websiteDocumentation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebsiteDocumentation',
    required: true,
    index: true
  },
  
  selectedPlan: {
    planName: String,
    sitePrice: Number,
    subscriptionPrice: Number,
    totalPrice: Number,
    subscriptionPlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlanVersion'
    }
  },
  
  projectStatus: {
    type: String,
    enum: ['initiated', 'documentation_created', 'plan_selected', 'payment_completed', 'in_progress', 'completed', 'cancelled'],
    default: 'initiated'
  },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed' , 'partial_payment'],
    default: 'pending'
  },
  
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  projectStartDate: Date,
  expectedCompletionDate: Date,
  actualCompletionDate: Date,
  
  notes: String,

  report: String,
  additionalDetails: String,
  report2: String,
  anyChanges: String,
  additionalSuggestions: String,
  websiteOverviewLink: String,

  percentageCompletion:{
    type: Number,
    default: 0
  },

  amountPaid: Number,
  amountPending: Number,

  // Final payment token for remaining 50% payment
  completionPaymentToken: {
    type: String,
    unique: true,
    sparse: true // Only create index for non-null values
  },
  hasPaymentLink: {
    type: Boolean,
    default: false
  },
  linkExpiry: Date,
  finalPaymentCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'WebsiteProjects'
});

export default mongoose.model('WebsiteProject', WebsiteProjectSchema);