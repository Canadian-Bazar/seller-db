import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['order', 'invoice', 'inquiry', 'inbox', 'review'],
      required: true,
      index: true,
    },

    title: {
      type: String,
    },

    message: {
      type: String,
    },

    refId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true, collection: 'Notification' },
)

export default mongoose.model('Notification', NotificationSchema)


