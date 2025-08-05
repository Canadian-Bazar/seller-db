import Orders from '../models/orders.schema.js';
import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import Chat from '../models/chat.schema.js';
import Message from '../models/messages.schema.js';
import mongoose from 'mongoose';






export const getOrders = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { page = 1, limit = 10, status, search } = validatedData;
        const sellerId = req.user._id;

        const effectiveLimit = Math.min(limit, 50);
        const skip = (page - 1) * effectiveLimit;

        const pipeline = [
            {
                $lookup: {
                    from: 'Quotation',
                    localField: 'quotationId',
                    foreignField: '_id',
                    as: 'quotation'
                }
            },
            {
                $unwind: '$quotation'
            },
            {
                $match: {
                    'quotation.seller': new mongoose.Types.ObjectId(sellerId)
                }
            }
        ];

        if (status) {
            pipeline.push({ $match: { status } });
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'Buyer',
                    localField: 'quotation.buyer',
                    foreignField: '_id',
                    as: 'buyer'
                }
            },
            {
                $unwind: '$buyer'
            },
            {
                $lookup: {
                    from: 'Product',
                    localField: 'quotation.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            }
        );

        // Add search filter if provided
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { orderId: { $regex: search, $options: 'i' } },
                        { 'product.name': { $regex: search, $options: 'i' } },
                        { 'buyer.fullName': { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $project: {
                    orderId: 1,
                    status: 1,
                    finalPrice: 1,
                    paymentStatus: 1,
                    trackingNumber: 1,
                    estimatedDeliveryDate: 1,
                    deliveredAt: 1,
                    createdAt: 1,
                    'buyer.fullName': 1,
                    'buyer.avatar':1 ,
                    'buyer.profilePic': 1,
                    'product.name': 1,
                    'product.images': 1,
                    'quotation.quantity': 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: effectiveLimit }
        );

        const orders = await Orders.aggregate(pipeline);

        // Count pipeline for pagination
        const countPipeline = [
            {
                $lookup: {
                    from: 'Quotations',
                    localField: 'quotationId',
                    foreignField: '_id',
                    as: 'quotation'
                }
            },
            {
                $unwind: '$quotation'
            },
            {
                $match: {
                    'quotation.seller': new mongoose.Types.ObjectId(sellerId)
                }
            }
        ];

        if (status) {
            countPipeline.push({ $match: { status } });
        }

        // Add the same lookups for search functionality in count pipeline
        if (search) {
            countPipeline.push(
                {
                    $lookup: {
                        from: 'Buyer',
                        localField: 'quotation.buyer',
                        foreignField: '_id',
                        as: 'buyer'
                    }
                },
                {
                    $unwind: '$buyer'
                },
                {
                    $lookup: {
                        from: 'Product',
                        localField: 'quotation.productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $unwind: '$product'
                },
                {
                    $match: {
                        $or: [
                            { orderId: { $regex: search, $options: 'i' } },
                            { 'product.name': { $regex: search, $options: 'i' } },
                            { 'buyer.fullName': { $regex: search, $options: 'i' } }
                        ]
                    }
                }
            );
        }

        countPipeline.push({ $count: 'total' });

        const [countResult] = await Orders.aggregate(countPipeline);
        const total = countResult?.total || 0;

        const response = {
            docs: orders,
            page: parseInt(page),
            limit: effectiveLimit,
            total,
            pages: Math.ceil(total / effectiveLimit),
            hasNext: skip + effectiveLimit < total,
            hasPrev: page > 1
        };

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, response)
        );

    } catch (err) {
        handleError(res, err);
    }
};




export const updateOrderStatus = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { orderId, status, trackingNumber, estimatedDeliveryDate } = validatedData;
        const sellerId = req.user._id;

        const order = await Orders.findOne({ orderId })
            .populate('quotationId');

        if (!order) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Order not found');
        }

        if (order.quotationId.seller.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You do not have access to this order');
        }

        // const validTransitions = {
        //     'pending': ['confirmed', 'cancelled'],
        //     'confirmed': ['processing', 'cancelled'],
        //     'processing': ['ready_to_ship', 'cancelled'],
        //     'ready_to_ship': ['shipped', 'cancelled'],
        //     'shipped': ['in_transit', 'delivered'],
        //     'in_transit': ['out_for_delivery', 'delivered'],
        //     'out_for_delivery': ['delivered', 'returned'],
        //     'delivered': ['returned'],
        //     'cancelled': [],
        //     'returned': []
        // };

        // if (!validTransitions[order.status].includes(status)) {
        //     throw buildErrorObject(httpStatus.BAD_REQUEST, `Cannot change status from ${order.status} to ${status}`);
        // }

        // Update order
        const updateData = { status };
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (estimatedDeliveryDate) updateData.estimatedDeliveryDate = estimatedDeliveryDate;
        if (status === 'delivered') updateData.deliveredAt = new Date();

        const updatedOrder = await Orders.findOneAndUpdate(
            { orderId },
            updateData,
            { new: true }
        );

        if (status === 'delivered') {
            await Chat.findByIdAndUpdate(order.chatId, {
                phase: 'completed',
                status: 'completed'
            });
        }

        await Message.create({
            senderId: sellerId,
            senderModel: 'Seller',
            content: `Order status updated to: ${status}${trackingNumber ? `. Tracking: ${trackingNumber}` : ''}`,
            chat: order.chatId,
            quotationId: order.quotationId._id,
            messageType: 'text',
            isRead: false
        });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: 'Order status updated successfully',
                order: updatedOrder
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};



export const getOrderById = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { orderId } = validatedData;
        const sellerId = req.user._id;

        const pipeline = [
            {
                $match: { orderId: orderId }
            },
            {
                $lookup: {
                    from: 'Quotation',
                    localField: 'quotationId',
                    foreignField: '_id',
                    as: 'quotation'
                }
            },
            {
                $unwind: '$quotation'
            },
            {
                $match: {
                    'quotation.seller': new mongoose.Types.ObjectId(sellerId)
                }
            },
            {
                $lookup: {
                    from: 'Buyer',
                    localField: 'quotation.buyer',
                    foreignField: '_id',
                    as: 'buyer'
                }
            },
            {
                $unwind: '$buyer'
            },

            // {
            //     $lookup: {
            //         from: 'BuyerAddresses',
            //         localField: 'billingAddress',
            //         foreignField: '_id',
            //         as: 'billingAddress'
            //     }
            // },
            // {
            //     $unwind: '$billingAddress'
            // },
            {
                $lookup: {
                    from: 'Product',
                    localField: 'quotation.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $lookup: {
                    from: 'Chat',
                    localField: 'chatId',
                    foreignField: '_id',
                    as: 'chat'
                }
            },
            {
                $unwind: '$chat'
            },
            {
                $lookup: {
                    from: 'Invoice',
                    localField: 'invoiceId',
                    foreignField: '_id',
                    as: 'invoice'
                }
            },
            {
                $unwind: '$invoice'
            },
            {
                $project: {
                    orderId: 1,
                    status: 1,
                    finalPrice: 1,
                    paymentMethod: 1,
                    paymentStatus: 1,
                    trackingNumber: 1,
                    estimatedDeliveryDate: 1,
                    deliveredAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    billingAddress: 1,
                    shippingAddress:1,
                    
                    // COMPLETE BUYER DATA
                    buyer: {
                        _id: '$buyer._id',
                        fullName: '$buyer.fullName',
                        email: '$buyer.email',
                        phone: '$buyer.phone',
                        profilePic: '$buyer.profilePic',
                        avatar:'$buyer.avatar' ,
                        companyName: '$buyer.companyName'
                    },
                    
                    product: {
                        _id: '$product._id',
                        name: '$product.name',
                        description: '$product.description',
                        images: '$product.images',
                        category: '$product.category',
                        specifications: '$product.specifications'
                    },
                    
                    quotation: {
                        _id: '$quotation._id',
                        quantity: '$quotation.quantity',
                        quotedPrice: '$quotation.quotedPrice',
                        validUntil: '$quotation.validUntil',
                        requirements: '$quotation.requirements',
                        createdAt: '$quotation.createdAt'
                    },
                    
                    
                    invoice: {
                        _id: '$invoice._id',
                        negotiatedPrice: '$invoice.negotiatedPrice',
                        taxAmount: '$invoice.taxAmount',
                        shippingCharges: '$invoice.shippingCharges',
                        paymentTerms: '$invoice.paymentTerms',
                        deliveryTerms: '$invoice.deliveryTerms',
                        createdAt: '$invoice.createdAt'
                    },
                    
                    // CHAT DATA
                    chat: {
                        _id: '$chat._id',
                        phase: '$chat.phase',
                        status: '$chat.status'
                    },
                    
                }
            }
        ];

        const [order] = await Orders.aggregate(pipeline);


        if (!order) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Order not found');
        }

        // Add valid status transitions
    

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, order)
        );

    } catch (err) {
        handleError(res, err);
    }
};