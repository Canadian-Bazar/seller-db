import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({


   slug:{
        type:String ,
        trim:true ,
        index:true ,
    } ,


    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sellers',
        required: true
    },

    name: { 
        type: String, 
        required: true 
    },
    description: {
        type: String,
        required: true
    },
  shortDescription: {
      type: String,
      trim: true,
      maxlength: 200
  },
  images: [{
      type: String
  }],
  thumbnail: {
      type: String
  },
  price: {
      type: Number,
      min: 0
  },
  originalPrice: {
      type: Number,
      min: 0
  },
  discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
  },
    avgRating: {
        type: Number, 
        default: 0.0,
        min: 0,
        max: 5
    },
    ratingsCount: {
        type: Number,
        default: 0,
        min: 0
    },
  rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
  },
  reviews: [{
      user: { type: mongoose.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
  }],

    isComplete: { 
        type: Boolean, 
        default: false,
        index: true
    },
    
    completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    
    incompleteSteps: [{
        type: String,
        enum: ['serviceInfo', 'capabilities', 'order', 'media']
    }],
    
    stepStatus: {
        serviceInfo: { type: Boolean, default: false },     
        capabilities: { type: Boolean, default: false },  
        order: { type: Boolean, default: false },     
        pricing: { type: Boolean, default: false },        
        customization: { type: Boolean, default: false },  
        media: { type: Boolean, default: false }           
    },

    category:{
        type:mongoose.Schema.Types.ObjectId ,
        ref:'Category' ,
        required:true
    } ,

  categoryName: {
      type: String,
      trim: true
  },
  subcategory: {
      type: mongoose.Types.ObjectId,
      ref: 'Category'
  },
  subcategoryName: {
      type: String,
      trim: true
  },
  duration: {
      value: { type: Number, min: 1 },
      unit: { type: String, enum: ['minutes', 'hours', 'days', 'weeks', 'months'] }
  },
  serviceType: {
      type: String,
      enum: ['one-time', 'recurring', 'subscription'],
      default: 'one-time'
  },
  recurringInterval: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  isAvailable: {
      type: Boolean,
      default: true
  },
  maxBookings: {
      type: Number,
      min: 1
  },
  currentBookings: {
      type: Number,
      default: 0,
      min: 0
  },
  tags: [{ type: String }],
  requirements: [{ type: String }],
  deliverables: [{ type: String }],
  features: [{ type: String }],

  isActive: {
      type: Boolean,
      default: true
  },
  isFeatured: {
      type: Boolean,
      default: false
  },
  isVerified: {
      type: Boolean,
      default: false
  },
  seoTitle: { type: String },
  seoDescription: { type: String },
  seoKeywords: [{ type: String }],
  city: { type: String },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  availability: {
      monday: { start: String, end: String, isAvailable: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, isAvailable: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, isAvailable: { type: Boolean, default: true } },
      thursday: { start: String, end: String, isAvailable: { type: Boolean, default: true } },
      friday: { start: String, end: String, isAvailable: { type: Boolean, default: true } },
      saturday: { start: String, end: String, isAvailable: { type: Boolean, default: true } },
      sunday: { start: String, end: String, isAvailable: { type: Boolean, default: true } }
  },
    isBlocked:{
        type: Boolean,
        default: false,
        index: true
    } ,

    isArchived:{
        type: Boolean,
        default: false,
        index: true
    } ,

   

}, { timestamps: true, collection: "Service" });

ServiceSchema.index({ name: 'text' });
ServiceSchema.index({ isVerified: 1 });
ServiceSchema.index({ avgRating: -1 });
ServiceSchema.index({ serviceType: 1 });
ServiceSchema.index({ category: 1, isActive: 1 });
ServiceSchema.index({ price: 1 });
ServiceSchema.index({ rating: -1 });
ServiceSchema.index({ createdAt: -1 });



ServiceSchema.pre('save', async function(next) {
    if (!this.isModified('name')) {
        return next();
    }
    
    const baseSlug = this.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    
    try {
        let slug = baseSlug;
        let count = 0;
        let existingService;
        
        do {
            if (count > 0) {
                slug = `${baseSlug}-${count}`;
            }
            
            existingService = await mongoose.models.Service.findOne({ 
                slug,
                _id: { $ne: this._id } // Exclude current document
            });
            count++;
        } while (existingService);
        
        this.slug = slug;
        next();
    } catch (error) {
        next(error);
    }
});

export default mongoose.model('Service', ServiceSchema)