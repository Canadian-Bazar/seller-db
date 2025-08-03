import mongoose from "mongoose";


const WebsiteTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    } ,

    url:{
        type:String ,
        required:true
    }
}, { timestamps: true, collection: 'WebsiteTemplate' 
    }
)

export default mongoose.model('WebsiteTemplate', WebsiteTemplateSchema)