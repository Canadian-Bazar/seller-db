import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({




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

    // Completion tracking - same pattern as products
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
        enum: ['serviceInfo', 'capabilities', 'order', 'pricing', 'customization', 'media']
    }],
    
    stepStatus: {
        serviceInfo: { type: Boolean, default: false },     // Basic service info
        capabilities: { type: Boolean, default: false },   // Technical capabilities & processes
        order: { type: Boolean, default: false },      // Service portfolio/examples
        pricing: { type: Boolean, default: false },        // Pricing structure
        customization: { type: Boolean, default: false },  // Customization options
        media: { type: Boolean, default: false }           // Images, videos, certifications
    },

}, { timestamps: true, collection: "Service" });

ServiceSchema.index({ name: 'text' });
ServiceSchema.index({ isVerified: 1 });
ServiceSchema.index({ avgRating: -1 });
ServiceSchema.index({ serviceType: 1 });



// Auto-generate slug from name - same pattern as products
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
      
      existingService = await mongoose.models.Service.findOne({ slug });
      count++;
    } while (existingService);
    
    this.slug = slug;
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model('Service', ServiceSchema)