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
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  features: {
    productListingPerMonth: { 
      type: Number, 
      min: 0,
      displayText: String  // Optional override for custom text
    },
    serviceListingPerMonth: { 
      type: Number, 
      min: 0,
      displayText: String
    },
    videoPerProduct: { 
      type: Number, 
      min: 0,
      displayText: String
    },
    featuredListingDaysPerMonth: { 
      type: Number, 
      min: 0,
      displayText: String
    },
    incomingInquiryLimit: { 
      type: Number, 
      min: 0,
      displayText: String
    },
    unlimitedSearch: { 
      type: Boolean, 
      default: true,
      displayText: String
    },
    dashboardAnalytics: { 
      type: Boolean, 
      default: false,
      displayText: String
    },
    securePayment: { 
      type: Boolean, 
      default: false,
      displayText: String
    },
    newsLetterAndIndustryInsights: { 
      type: Boolean, 
      default: false,
      displayText: String
    },
    essentialSEOSupport: { 
      type: Boolean, 
      default: false,
      displayText: String
    },
    verifiedBadge: { 
      type: Boolean, 
      default: false,
      displayText: String
    },
    prioritySupport: { 
      type: Boolean, 
      default: false,
      displayText: String
    },
    accessToRFQ: { 
      type: Boolean, 
      default: false,
      displayText: String
    },
    customFeatures: [{
      name: String,
      value: mongoose.Schema.Types.Mixed,
      type: {
        type: String,
        enum: ['boolean', 'number', 'string', 'array']
      },
      displayText: String,  // Custom display text for this feature
      category: String,     // For grouping: 'listings', 'analytics', 'support'
      highlight: Boolean    // For highlighting premium features
    }]
  },
  
  // Virtual field that auto-generates from features
  featuresArray: {
    type: [String],
    default: function() {
      return this.generateFeaturesList();
    }
  },
  
  isCurrent: { type: Boolean, default: true, index: true },
  isDeprecated: { type: Boolean, default: false, index: true },
  effectiveDate: { type: Date, default: Date.now },
  deprecationDate: Date,
}, {
  timestamps: true,
  collection: 'SubscriptionPlanVersion'
});

SubscriptionPlanVersionSchema.methods.generateFeaturesList = function() {
  const features = [];
  const f = this.features;
  
  if (f.productListingPerMonth === -1) {
    features.push(f.productListingPerMonth?.displayText || "Unlimited products & services");
  } else if (f.productListingPerMonth > 0) {
    features.push(f.productListingPerMonth?.displayText || `Up to ${f.productListingPerMonth} products & services`);
  }
  
  if (f.videoPerProduct === -1) {
    features.push(f.videoPerProduct?.displayText || "Unlimited videos per product");
  } else if (f.videoPerProduct > 0) {
    features.push(f.videoPerProduct?.displayText || `${f.videoPerProduct} video per product`);
  }
  
  if (f.unlimitedSearch) {
    features.push(f.unlimitedSearch?.displayText || "Unlimited searches");
  }
  
  if (f.dashboardAnalytics) {
    features.push(f.dashboardAnalytics?.displayText || "Dashboard Analytics");
  }
  
  if (f.featuredListingDaysPerMonth > 0) {
    features.push(f.featuredListingDaysPerMonth?.displayText || 
      `1 Featured Listing per month for ${f.featuredListingDaysPerMonth} days`);
  }
  
  if (f.incomingInquiryLimit === -1) {
    features.push(f.incomingInquiryLimit?.displayText || "Unlimited incoming leads");
  } else if (f.incomingInquiryLimit > 0) {
    features.push(f.incomingInquiryLimit?.displayText || 
      `${f.incomingInquiryLimit} incoming buyer inquiries per month`);
  }
  
  if (f.securePayment) {
    features.push(f.securePayment?.displayText || "Secure payment system");
  }
  
  if (f.newsLetterAndIndustryInsights) {
    features.push(f.newsLetterAndIndustryInsights?.displayText || "Newsletter and industry insights");
  }
  
  if (f.essentialSEOSupport) {
    features.push(f.essentialSEOSupport?.displayText || "Essential SEO support");
  }
  
  if (f.verifiedBadge) {
    features.push(f.verifiedBadge?.displayText || "Verified badge");
  }
  
  if (f.accessToRFQ) {
    features.push(f.accessToRFQ?.displayText || "Access to RFQ (full global quote)");
  }
  
  if (f.customFeatures && f.customFeatures.length > 0) {
    f.customFeatures.forEach(feature => {
      if (feature.displayText) {
        features.push(feature.displayText);
      } else if (feature.type === 'boolean' && feature.value) {
        features.push(feature.name.replace(/([A-Z])/g, ' $1').toLowerCase());
      } else if (feature.type === 'number' && feature.value > 0) {
        features.push(`${feature.name}: ${feature.value}`);
      }
    });
  }
  
  return features;
};

SubscriptionPlanVersionSchema.pre('save', function(next) {
  if (this.isModified('features')) {
    this.featuresArray = this.generateFeaturesList();
  }
  next();
});



export default mongoose.model('SubscriptionPlanVersion', SubscriptionPlanVersionSchema);
