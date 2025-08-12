import mongoose from 'mongoose'

const SellerVerification = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: false
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
    isPhoneNumberVerified: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    password: {
        type: String,
        trim: true
    },
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
    },
    
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockedUntil: {
        type: Date,
        default: null
    },
    totalFailedAttempts: {
        type: Number,
        default: 0
    },
    lastFailedAttempt: {
        type: Date,
        default: null
    },
    blockReason: {
        type: String,
        enum: ['email_attempts', 'phone_attempts'],
        default: null
    },
    
    phoneBlockedUntil: {
        type: Date,
        default: null
    },
    phoneBlockReason: {
        type: String,
        enum: ['too_many_attempts', 'abuse_detected'],
        default: null
    } ,
    expiresAt: {
        type: Date,
        default: null,
        expires: 0 
    }
}, {
    collection: 'SellerVerification',
    timestamps: true,
    expireAfterSeconds: 1800
})

SellerVerification.methods.isVerificationBlocked = function() {
    if (!this.isBlocked || !this.blockedUntil) {
        return false;
    }
    
    if (this.blockedUntil <= new Date()) {
        this.isBlocked = false;
        this.blockedUntil = null;
        this.blockReason = null;
        this.emailOtpAttempts = 0;
        this.phoneOtpAttempts = 0;
        this.totalFailedAttempts = 0;
        this.lastFailedAttempt = null;
        
        this.save().catch(err => console.error('Error auto-resetting block:', err));
        
        return false;
    }
    
    return true;
}

SellerVerification.statics.isPhoneBlocked = async function(phoneNumber) {
    const now = new Date();

    console.log("phone" , phoneNumber)
    
    const activeBlock = await this.findOne({
        phoneNumber,
        phoneBlockedUntil: { $gt: now }
    });
    
    if (activeBlock) {
        const remainingTime = Math.ceil((activeBlock.phoneBlockedUntil - now) / (1000 * 60));
        return { 
            isBlocked: true, 
            remainingTime,
            reason: activeBlock.phoneBlockReason 
        };
    }
    
    return { isBlocked: false };
}

// Static method to block phone number globally
SellerVerification.statics.blockPhoneNumber = async function(phoneNumber, reason = 'too_many_attempts') {
    const blockUntil = new Date(Date.now() + 30 * 60 * 1000); 
    
    await this.updateMany(
        { phoneNumber },
        {
            $set: {
                phoneBlockedUntil: blockUntil,
                phoneBlockReason: reason,
                expiresAt: new Date(Date.now() + 35 * 60 * 1000) 
            }
        }
    );
}

SellerVerification.methods.blockVerification = function(reason) {
    this.isBlocked = true;
    this.blockedUntil = new Date(Date.now() + 30 * 60 * 1000); 
    this.blockReason = reason;
    this.lastFailedAttempt = new Date();
}

SellerVerification.methods.resetAllAttempts = function() {
    this.emailOtpAttempts = 0;
    this.phoneOtpAttempts = 0;
    this.totalFailedAttempts = 0;
    this.isBlocked = false;
    this.blockedUntil = null;
    this.blockReason = null;
    this.lastFailedAttempt = null;
}

export default mongoose.model('SellerVerification', SellerVerification)