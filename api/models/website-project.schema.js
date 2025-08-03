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
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  projectStartDate: Date,
  expectedCompletionDate: Date,
  actualCompletionDate: Date,
  
  notes: String ,

  report:String 

}, {
  timestamps: true,
  collection: 'WebsiteProjects'
});

export default mongoose.model('WebsiteProject', WebsiteProjectSchema);