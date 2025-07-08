import mongoose from 'mongoose'

const SellerContactChangeSchema = new mongoose.Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    
    changeType: {
        type: String,
        enum: ['email', 'phone'],
        required: true
    },
    
    // Current contact details for verification
    currentEmail: {
        type: String,
        required: function() {
            return this.changeType === 'email' || this.step === 'verify_current';
        }
    },
    
    currentPhone: {
        type: String,
        required: function() {
            return this.changeType === 'phone' || this.step === 'verify_current';
        }
    },
    
    // New contact details
    newEmail: {
        type: String,
        required: function() {
            return this.changeType === 'email' && this.step === 'verify_new';
        }
    },
    
    newPhone: {
        type: String,
        required: function() {
            return this.changeType === 'phone' && this.step === 'verify_new';
        }
    },
    
    // Current step in the process
    step: {
        type: String,
        enum: ['verify_current', 'verify_new', 'completed'],
        default: 'verify_current'
    },
    
    // OTP for current contact verification
    currentContactOtp: {
        type: Number,
        required: function() {
            return this.step === 'verify_current';
        }
    },
    
    currentContactOtpExpiry: {
        type: Date,
        required: function() {
            return this.step === 'verify_current';
        }
    },
    
    currentContactOtpAttempts: {
        type: Number,
        default: 0,
        max: 5
    },
    
    // OTP for new contact verification
    newContactOtp: {
        type: Number,
        required: function() {
            return this.step === 'verify_new';
        }
    },
    
    newContactOtpExpiry: {
        type: Date,
        required: function() {
            return this.step === 'verify_new';
        }
    },
    
    newContactOtpAttempts: {
        type: Number,
        default: 0,
        max: 5
    },
    
    // Session management
    sessionToken: {
        type: String,
        required: true,
        unique: true
    },
    
    // Status tracking
    isCurrentContactVerified: {
        type: Boolean,
        default: false
    },
    
    isNewContactVerified: {
        type: Boolean,
        default: false
    },
    
    isCompleted: {
        type: Boolean,
        default: false
    },
    
    // Security
    requestIp: {
        type: String,
        required: false
    },
    
    requestUserAgent: {
        type: String,
        required: false
    }
    
}, {
    collection: 'SellerContactChanges',
    timestamps: true,
    expires: 3600
})

SellerContactChangeSchema.index({ sellerId: 1, changeType: 1, isCompleted: 1 })
SellerContactChangeSchema.index({ sessionToken: 1 })
SellerContactChangeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 })

SellerContactChangeSchema.pre('save', async function(next) {
    if (this.isNew) {
        await this.constructor.deleteMany({
            sellerId: this.sellerId,
            changeType: this.changeType,
            isCompleted: false
        });
    }
    next();
});

export default mongoose.model('SellerContactChange', SellerContactChangeSchema)