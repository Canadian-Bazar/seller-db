import paginate from "mongoose-paginate-v2"; 
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import mongoose from 'mongoose'

const ChatSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Buyer'
    },
    
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Seller'
    },
    
    // Current active quotation
    activeQuotation: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Quotation'
    },
    
    // History of quotations discussed in this chat
    quotationHistory: [{
        quotation: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Quotation'
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'expired'],
            default: 'pending'
        }
    }],
    
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    
    unreadBy: {
        type: String,
        enum: ['buyer', 'seller'],
        default: 'buyer'
    },
    
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active'
    }
}, {timestamps: true, collection: 'Chat'})

ChatSchema.plugin(paginate);
ChatSchema.plugin(mongooseAggregatePaginate);

export default mongoose.model('Chat', ChatSchema)