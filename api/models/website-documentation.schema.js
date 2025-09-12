import mongoose from "mongoose";

const WebsiteDocumentationSchema = new mongoose.Schema({
  
  documentation: {
    type: String,
    required: true
  },


  websiteQuotationId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'WebsiteQuotation',
    required:true

  } ,
  
  pricingPlans: [{
    planName: {
      type: String,
      required: true,
      trim: true
    },
    subscriptionPlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlanVersion',
      required: false,  
      index: true
    },
    subscriptionPrice: {
      type: Number,
      required: false,  
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
    } ,
    selected: {
      type: Boolean,
      default: false
    }

   

   
  }],

    expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
    index: { expireAfterSeconds: 0 }
  } ,

   token:{
      type:String  ,
      required:true
    } ,
     status:{
      type:String ,
      required:true ,
      enum:['pending' , 'approved' ,'rejected'   ] ,
      default:'pending'

    } ,

    rejectionReason: {
      type: String,
      required: false
    },

    feedback: {
      type: String,
      required: false
    },

    rejectedAt: {
      type: Date,
      required: false
    },
  


}, {
  timestamps: true,
  collection: 'WebsiteDocumentation'
});

export default mongoose.model('WebsiteDocumentation', WebsiteDocumentationSchema);