import mongoose from 'mongoose'

const SellerVerification = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true
    },
    phoneNumberOtp: {
        type: Number,
        required: true
    },
    email: {
        type: String,
    },
    emailOtp: {
        type: Number,
        required: true
    },

    isPhoneNumberVerified:{
        type:Boolean ,
        default:false 
    } ,
    isEmailVerified:{
        type:Boolean ,
        default:false ,
    }
 
}, {
    collection: 'SellerVerification',
    timestamps: true ,
    expireAfterSeconds: 600
})


export default mongoose.model('SellerVerification', SellerVerification)