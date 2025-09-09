import paginate from "mongoose-paginate-v2"; 
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import mongoose from 'mongoose'

const WebsiteProjectChatSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Seller'
    },
    
    websiteProjectId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'WebsiteProject'
    },
    
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebsiteProjectMessage'
    },
    
    unreadBy: {
        type: String,
        enum: ['admin', 'seller'],
        default: 'admin'
    },
    
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    
    lastSeenAt: {
        admin: {
            type: Date,
            default: null
        },
        seller: {
            type: Date,
            default: null
        }
    }
}, {timestamps: true, collection: 'WebsiteProjectChat'})

WebsiteProjectChatSchema.plugin(paginate);
WebsiteProjectChatSchema.plugin(mongooseAggregatePaginate);

export default mongoose.model('WebsiteProjectChat', WebsiteProjectChatSchema)