import httpStatus from 'http-status'
import { matchedData } from 'express-validator'

import Notification from '../models/notification.schema.js'
import Quotation from '../models/quotations.schema.js'
import ServiceQuotation from '../models/service-quotations.schema.js'
import Chat from '../models/chat.schema.js'
import ServiceChat from '../models/service-chat.schema.js'
import Orders from '../models/orders.schema.js'
import Review from '../models/review.schema.js'
import mongoose from 'mongoose'
import handleError from '../utils/handleError.js'
import buildResponse from '../utils/buildResponse.js'

export const listNotifications = async (req, res) => {
  try {
    const sellerId = req.user._id
    const { page = 1, limit = 10, type, unreadOnly } = req.query

    const effectiveLimit = Math.min(parseInt(limit) || 10, 50)
    const skip = (parseInt(page) - 1) * effectiveLimit

    const filter = { seller: sellerId }
    if (type) filter.type = type
    if (String(unreadOnly) === 'true') filter.isRead = false

    const [docs, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(effectiveLimit),
      Notification.countDocuments(filter),
    ])

    return res
      .status(httpStatus.OK)
      .json(
        buildResponse(httpStatus.OK, {
          docs,
          page: parseInt(page),
          limit: effectiveLimit,
          total,
          pages: Math.ceil(total / effectiveLimit),
          hasNext: skip + effectiveLimit < total,
          hasPrev: parseInt(page) > 1,
        }),
      )
  } catch (err) {
    handleError(res, err)
  }
}

export const getCounts = async (req, res) => {
  try {
    const sellerId = new mongoose.Types.ObjectId(req.user._id.toString())

    // Persisted notification counts (fallback/extra)
    const persistedCountsPromise = Notification.aggregate([
      { $match: { seller: sellerId, isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ])

    // Dynamic counts
    const inquiryCountsPromise = Promise.all([
      Quotation.countDocuments({ seller: sellerId, seen: { $ne: true } }),
      ServiceQuotation.countDocuments({ seller: sellerId, seen: { $ne: true } }),
    ])

    const inboxCountsPromise = Promise.all([
      Chat.countDocuments({ seller: sellerId, status: 'active', unreadBy: 'seller' }),
      ServiceChat.countDocuments({ seller: sellerId, status: 'active', unreadBy: 'seller' }),
    ])

    const recentWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const invoiceCountsPromise = Promise.all([
      Chat.countDocuments({ seller: sellerId, 'activeInvoice.status': { $in: ['accepted', 'rejected'] }, 'activeInvoice.respondedAt': { $gte: recentWindow } }),
      ServiceChat.countDocuments({ seller: sellerId, 'activeInvoice.status': { $in: ['accepted', 'rejected'] }, 'activeInvoice.respondedAt': { $gte: recentWindow } }),
    ])

    const ordersCountPromise = Orders.aggregate([
      { $match: { createdAt: { $gte: recentWindow } } },
      { $lookup: { from: 'Quotation', localField: 'quotationId', foreignField: '_id', as: 'quotation' } },
      { $unwind: '$quotation' },
      { $match: { 'quotation.seller': sellerId } },
      { $count: 'total' },
    ])

    // Reviews are excluded from counts
    const reviewCountPromise = Promise.resolve([{ total: 0 }])

    const [persistedCounts, [prodInquiries, serviceInquiries], [prodInbox, serviceInbox], [prodInvoice, serviceInvoice], ordersCountPromiseResolved, reviewsCountPromiseResolved] = await Promise.all([
      persistedCountsPromise,
      inquiryCountsPromise,
      inboxCountsPromise,
      invoiceCountsPromise,
      ordersCountPromise,
      reviewCountPromise,
    ])

    const counts = {
      order: (ordersCountPromiseResolved?.[0]?.total || 0),
      invoice: (prodInvoice + serviceInvoice) || 0,
      inquiry: (prodInquiries + serviceInquiries) || 0,
      inbox: (prodInbox + serviceInbox) || 0,
      review: 0,
      productInquiries: prodInquiries || 0,
      serviceInquiries: serviceInquiries || 0,
      // Expose split inbox counts for UI parity with buyer side
      productInbox: prodInbox || 0,
      serviceInbox: serviceInbox || 0,
      total: 0,
    }

    // Add persisted notification counts (if any) on top of dynamic ones, bucket-wise
    for (const g of persistedCounts) {
      const key = g._id
      if (key === 'review') continue; // exclude reviews from counts
      if (counts[key] !== undefined) {
        counts[key] += g.count
      }
    }

    counts.total = counts.order + counts.invoice + counts.inquiry + counts.inbox

    return res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.OK, counts))
  } catch (err) {
    handleError(res, err)
  }
}

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const sellerId = req.user._id
    const updated = await Notification.findOneAndUpdate(
      { _id: id, seller: sellerId },
      { $set: { isRead: true } },
      { new: true },
    )
    return res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.OK, updated))
  } catch (err) {
    handleError(res, err)
  }
}

export const markAllAsRead = async (req, res) => {
  try {
    const sellerId = req.user._id
    await Notification.updateMany({ seller: sellerId, isRead: false }, { $set: { isRead: true } })
    return res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.OK, { success: true }))
  } catch (err) {
    handleError(res, err)
  }
}

export const removeNotification = async (req, res) => {
  try {
    const { id } = req.params
    const sellerId = req.user._id
    await Notification.deleteOne({ _id: id, seller: sellerId })
    return res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.OK, { success: true }))
  } catch (err) {
    handleError(res, err)
  }
}


export const markTypeAsRead = async (req, res) => {
  try {
    const sellerId = req.user._id
    const { type } = req.body || {}
    const allowed = ['order', 'invoice', 'inquiry', 'inbox', 'review']
    if (!allowed.includes(type)) {
      return res.status(httpStatus.BAD_REQUEST).json(buildResponse(httpStatus.BAD_REQUEST, { message: 'Invalid type' }))
    }

    await Notification.updateMany({ seller: sellerId, type, isRead: false }, { $set: { isRead: true } })

    return res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.OK, { success: true }))
  } catch (err) {
    handleError(res, err)
  }
}


