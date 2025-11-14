import mongoose from 'mongoose'
import aggregatePaginate from 'mongoose-aggregate-paginate-v2'
import paginate from 'mongoose-paginate-v2'
import { slugify, generateUniqueSlug } from '../utils/slug.js'

const SellerSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true,
    },

    slug: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        sparse: true,
        index: true,
    },

     phone: {
          type: String,
          required: true,
          trim: true,
          unique: true,
     },
     email: {
          type: String,
          required: true,
          trim: true,
          unique: true,
          lowercase: true,
     },

  


     parentCategory:{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
          required: false,
     } ,

     categories: [
          {
                type: mongoose.Types.ObjectId ,
                ref:'Category' ,
          }
     ],
     businessNumber: {
          type: String,
          required: false,
          trim: true,
     },
    
    approvalStatus: {
         type: String,
         enum: ['pending' ,'submitted', 'approved', 'rejected'],
         default: 'pending',
    },
     password: {
          type: String,
          required: true,
          trim: true,
     },
   
     logo: {
          type: String
     },


     street:{
        type:String ,
        required:false
    } ,
    city:{
        type:String , 
        required:false ,
    } ,
    state:{
        type:String ,
        required:false ,
    } ,

    zip:{
        type:String ,
        required:false ,
    } ,
   
    isVerified: {
         type: Boolean,
         default: false,
         required: true
    } ,
     isProfileComplete:{
          type:Boolean ,
          default:false , 
          required:true
     } ,

     isBlocked: {
          type: Boolean,
          default: false,
          required: true
     },
     blockReason: {
          type: String,
          required: false,
          trim: true
     },

     stripeCustomerId:{
          type:String
     } ,

     companyWebsite:{
          type:String ,
     } ,

     yearEstablished:{
          type:Number ,
     } ,

     numberOfEmployees:{
          type:Number ,
     } ,

     certifications:[{
          name: String ,
          url: String
     }]  ,

     socialMediaLinks:[{
          platform: String ,
          url: String
     }] ,

     businessType: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'BusinessType',
          required: false,
     },


     languagesSupported:[
          {
               code:String ,
               name:String 
          }
     ]
    

}, {
     timestamps: true,
     collection: 'Sellers',
})

SellerSchema.pre('save', async function setSlug(next) {
    try {
        // Always generate slug for new documents or when companyName changes
        // Skip only if slug already exists and companyName hasn't changed
        if (!this.isNew && !this.isModified('companyName') && this.slug) {
            return next()
        }

        // Generate slug from companyName
        if (this.companyName) {
            const baseSlug = slugify(this.companyName, 'seller')
            this.slug = await generateUniqueSlug(
                this.constructor,
                baseSlug,
                this._id,
                'seller'
            )
        }
        return next()
    } catch (err) {
        return next(err)
    }
})

SellerSchema.plugin(paginate)
SellerSchema.plugin(aggregatePaginate)

export default mongoose.model('Seller', SellerSchema)