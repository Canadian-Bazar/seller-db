import mongoose from 'mongoose';


const SellerSubscriptionSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true 
  },
  planVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlanVersion',
    required: true,
    index: true
  },
  startDate: { 
    type: Date, 
    required: true,
    index: true 
  },
  endDate: { 
    type: Date, 
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        return v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending', 'suspended'],
    default: 'active',
    index: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },
  autoRenew: { type: Boolean, default: true },


  

  


}, { 
  timestamps: true,
  collection: 'SellerSubscription',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

SellerSubscriptionSchema.index({ seller: 1, status: 1 });


SellerSubscriptionSchema.virtual('planDetails', {
  ref: 'SubscriptionPlanVersion',
  localField: 'planVersionId',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model('SellerSubscription', SellerSubscriptionSchema);
