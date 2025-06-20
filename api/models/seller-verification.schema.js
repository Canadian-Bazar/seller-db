import mongoose from 'mongoose'

const SellerVerification = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required:false
    },
    phoneNumberOtp: {
        type: Number,
        required: false
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
    } ,
    password:{
        type:String ,
        trim:true
    } ,

    companyName: {
        type: String,
        trim: true,
    },
    currentStep: {
        type: String,
        enum: ['email_verification', 'phone_verification', 'completed'],
        default: 'email_verification'
    },
    sessionToken: {
        type: String,
        required: true,
        unique: true
    },
    
    emailOtpAttempts: {
        type: Number,
        default: 0,
        max: 5
    },
    phoneOtpAttempts: {
        type: Number,
        default: 0,
        max: 5
    },
    emailOtpExpiry: {
        type: Date
    },
    phoneOtpExpiry: {
        type: Date
    }
 
}, {
    collection: 'SellerVerification',
    timestamps: true ,
    expireAfterSeconds: 600
})


export default mongoose.model('SellerVerification', SellerVerification)