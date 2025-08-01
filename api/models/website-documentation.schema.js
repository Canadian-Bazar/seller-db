import mongoose from "mongoose";

const WebsiteDocumentationSchema = new mongoose.Schema({
  
  documentationFile: {
    type: String,
    required: true
  },
  
  // Flexible pricing plans array
  pricingPlans: [{
    planName: {
      type: String,
      required: true,
      trim: true
    },
    subscriptionPlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlanVersion',
      required: false,  // Not required if user already has subscription
      index: true
    },
    subscriptionPrice: {
      type: Number,
      required: false,  // Not needed if user has existing subscription
      min: 0,
      default: 0
    },
    sitePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true,
  collection: 'WebsiteDocumentation'
});

export default mongoose.model('WebsiteDocumentation', WebsiteDocumentationSchema);