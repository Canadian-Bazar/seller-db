import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import paginate from 'mongoose-paginate-v2'
import { type } from "os";

const ProductSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    slug: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 200
    },
    images: [String],
    videos:[String] ,
    thumbnail: {
      type: String
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
      comment: { type: String, trim: true },
      createdAt: { type: Date, default: Date.now }
    }],
    about: [String],
    services: [String], 
    descriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductDescription'
    },
    minPrice:{
      type:Number ,
    } ,
    unitPrice:{
      type:Number ,
    } ,
    maxPrice:{
      type:Number ,
    } ,
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
    moq:{
      type:Number ,
      default:null
    } ,
    categoryId:{
      type:mongoose.Types.ObjectId ,
      ref:'Category',
      required:true
    } ,
    category: {
      type: mongoose.Types.ObjectId,
      ref: 'Category'
    },
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
    isVerified:{
      type:Boolean ,
      default:false ,
      required:true
    } ,
    deliveryDays:{
      type:Number ,
      required:true,
      default:1
    } ,
    isCustomizable:{
      type:Boolean ,
      default:false,
      required:true
    } ,
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
      enum: ['productInfo', 'attributes', 'images', 'pricing', 'services']
    }],
    stepStatus: {
      productInfo: { type: Boolean, default: false },   
      attributes: { type: Boolean, default: false },     
      images: { type: Boolean, default: false },         
      pricing: { type: Boolean, default: false },         
      services: { type: Boolean, default: false },    
    },
    brochure:{
      type:String ,
      default:null
    } ,
    isBlocked:{
      type:Boolean ,
      default:false ,
      required:true
    } ,
    isArchived:{
      type:Boolean ,
      default:false ,
      required:true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    seller: {
      type: mongoose.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true
    }
}, { timestamps: true , collection:"Product" } );

// Indexes (superset)
ProductSchema.index({ name: 'text' });
ProductSchema.index({ description: 'text' });
ProductSchema.index({ isVerified: 1 });
ProductSchema.index({ avgRating: -1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ createdAt: -1 });

ProductSchema.plugin(paginate)
ProductSchema.plugin(aggregatePaginate)

ProductSchema.pre('save', async function(next) {
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
    let existingProduct;
    
    do {
      if (count > 0) {
        slug = `${baseSlug}-${count}`;
      }
      
      existingProduct = await mongoose.models.Product.findOne({ slug });
      count++;
    } while (existingProduct);
    
    this.slug = slug;
    next();
  } catch (error) {
    next(error);
  }
});



export default mongoose.model('Product' , ProductSchema)


