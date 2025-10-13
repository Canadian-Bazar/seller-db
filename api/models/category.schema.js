import mongoose from 'mongoose'
import  paginate from 'mongoose-paginate-v2'
import  aggregatePaginate  from 'mongoose-aggregate-paginate-v2';


const CategorySchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }  ,
    parentCategory:{
        type:mongoose.Types.ObjectId ,
        ref:"Category" ,
        
    } ,

    ancestors:[
        {
            type:mongoose.Types.ObjectId ,
            ref:"Category" ,
            
        }
    ] ,

    image:{
        type:String 
    },
    city: {
        type: String,
        trim: true
    }

  }, { timestamps: true  , collection:'Category'});

CategorySchema.plugin(paginate);
CategorySchema.plugin(aggregatePaginate);

// Ensure virtuals are included in JSON/Object outputs
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });

// Virtual field to mirror blog's coverImage pattern (filename/key from image URL)
CategorySchema.virtual('coverImage').get(function() {
  const image = this.image;
  if (!image || typeof image !== 'string') return undefined;
  const lastSlashIndex = image.lastIndexOf('/');
  return lastSlashIndex >= 0 ? image.substring(lastSlashIndex + 1) : image;
});

export default mongoose.model('Category', CategorySchema);