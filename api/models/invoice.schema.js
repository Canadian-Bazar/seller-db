import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({
    description: { type: String, required: false, default: '' },
    quantity: { type: Number, required: true, min: 0, default: 1 },
    unitPrice: { type: Number, required: true, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
    quotationId: {
        type: mongoose.Types.ObjectId,
        ref: 'Quotation',
        required: true
    },

    chatId: {
        type: mongoose.Types.ObjectId,
        ref: 'Chat',
    },

    sellerId: {
        type: mongoose.Types.ObjectId,
        ref: 'Seller',
        required: true
    },

    buyer: {
        type: mongoose.Types.ObjectId,
        ref: 'Buyer',
        required: true
    },

    // Display block for PDFs/UI, auto-filled from Seller/Buyer at creation
    seller: {
        id: {
            type: mongoose.Types.ObjectId,
            ref: 'Seller',
            required: true
        },
        businessName: { type: String, required: true },
        logo: { type: String, default: null },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        website: { type: String, default: null },
        taxId: { type: String, default: null },
        address: {
            street: { type: String, default: '' },
            city: { type: String, default: '' },
            state: { type: String, default: '' },
            postalCode: { type: String, default: '' },
            country: { type: String, default: '' }
        }
    },

    buyerInfo: {
        id: { type: mongoose.Types.ObjectId, ref: 'Buyer', required: true },
        name: { type: String, required: true },
        email: { type: String, default: null },
        phone: { type: String, default: null },
        address: {
            city: { type: String, default: '' },
            state: { type: String, default: '' }
        }
    },

    // Commercial fields
    invoiceNumber: { type: String, unique: true, index: true },
    invoiceDate: { type: Date, default: () => new Date() },
    dueDate: { type: Date, default: null },
    currency: { type: String, default: 'CAD' },
    poNumber: { type: String, default: null },

    items: { type: [LineItemSchema], default: [] },

    negotiatedPrice: { // base price or subtotal in simple case
        type: Number,
        required: true,
        min: 0
    },
    taxAmount: { type: Number, default: 0, min: 0 },
    shippingCharges: { type: Number, default: 0, min: 0 },
    additionalFees: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },

    paymentTerms: { type: String, default: null },
    deliveryTerms: { type: String, default: null },
    acceptedPaymentMethods: { type: [String], default: [] },
    notes: { type: String, default: null },

    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    viewedByBuyer: { type: Boolean, default: false },
    viewedAt: { type: Date, default: null },

    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
}, {
    timestamps: true,
    collection: 'Invoice'
});

InvoiceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
InvoiceSchema.index({ quotationId: 1 });
InvoiceSchema.index({ sellerId: 1 });
InvoiceSchema.index({ buyer: 1 });
InvoiceSchema.index({ status: 1 });

export default mongoose.model('Invoice', InvoiceSchema);