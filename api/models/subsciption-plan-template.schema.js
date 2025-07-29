import mongoose from 'mongoose';


const SubscriptionPlanTemplateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: { 
    type: String,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true,
  collection: 'SubscriptionPlanTemplate'
});

export default mongoose.model('SubscriptionPlanTemplate', SubscriptionPlanTemplateSchema);
