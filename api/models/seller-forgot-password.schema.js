import mongoose from 'mongoose'

const SellerForgotPasswordSchema = new mongoose.Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    
      identifierType: {
        type: String,
        enum: ['email', 'phone'],
        required: true
    },
    otp: {
        type: Number,
        required: true
    },
    otpExpiry: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0,
        max: 5
    },
    sessionToken: {
        type: String,
        required: true,
        unique: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 
    }
    
}, {
    collection: 'SellerContactChanges',
    timestamps: true,
    expires: 3600
})

SellerForgotPasswordSchema.index({ sellerId: 1,})
SellerForgotPasswordSchema.index({ sessionToken: 1 })
SellerForgotPasswordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 })

SellerForgotPasswordSchema.pre('save', async function(next) {
    if (this.isNew) {
        await this.constructor.deleteMany({
            sellerId: this.sellerId,
           
        });
    }
    next();
});

export default mongoose.model('SellerForgotPassword', SellerForgotPasswordSchema)