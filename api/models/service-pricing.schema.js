import mongoose from "mongoose";

const ServicePricingSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },

    perModelPrice: {type:Number},
    perHourPrice: {type:Number}, 
    perBatchPrice: {type:Number},
    volume: {type:Number , required:true},
    customQuoteEnabled: {type:Boolean , default:false}

}, { 
    collection: 'ServicePricing', 
    timestamps: true 
});

export default mongoose.model('ServicePricing', ServicePricingSchema);