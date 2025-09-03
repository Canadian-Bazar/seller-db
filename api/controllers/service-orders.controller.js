import ServiceOrders from '../models/service-orders.schema.js';
import handleError from '../utils/handleError.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import { matchedData } from 'express-validator';
import httpStatus from 'http-status';
import ServiceChat from '../models/service-chat.schema.js';
import ServiceMessages from '../models/service-messages.schema.js';
import mongoose from 'mongoose';

export const getServiceOrders = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { page = 1, limit = 10, status, search } = validatedData;
        const sellerId = req.user._id;

        const effectiveLimit = Math.min(limit, 50);
        const skip = (page - 1) * effectiveLimit;


        console.log('seller' , sellerId)

        const pipeline = [
            {
                $lookup: {
                    from: 'ServiceQuotation',
                    localField: 'serviceQuotationId',
                    foreignField: '_id',
                    as: 'serviceQuotation'
                }
            },
            {
                $unwind: '$serviceQuotation'
            },
            {
                $match: {
                    'serviceQuotation.seller': new mongoose.Types.ObjectId(sellerId)
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
                    localField: 'serviceQuotation.buyer',
                    foreignField: '_id',
                    as: 'buyer'
                }
            },
            {
                $unwind: '$buyer'
            },
            {
                $lookup: {
                    from: 'Service',
                    localField: 'serviceQuotation.serviceId',
                    foreignField: '_id',
                    as: 'service'
                }
            },
            {
                $unwind: '$service'
            },
            {
                $lookup: {
                    from: 'ServiceMedia',
                    localField: 'service._id',
                    foreignField: 'serviceId',
                    as: 'serviceMedia'
                }
            },
            {
                $unwind: {
                    path: '$serviceMedia',
                    preserveNullAndEmptyArrays: true
                }
            }
        );

        // Add search filter if provided
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { orderId: { $regex: search, $options: 'i' } },
                        { 'service.name': { $regex: search, $options: 'i' } },
                        { 'serviceQuotation.title': { $regex: search, $options: 'i' } },
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
                    trackingNumber: 1,
                    estimatedDeliveryDate: 1,
                    deliveredAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'buyer.fullName': 1,
                    'buyer.avatar': 1,
                    'buyer.profilePic': 1,
                    'service.name': 1,
                    'service.images': '$serviceMedia.images'
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: effectiveLimit }
        );

        const orders = await ServiceOrders.aggregate(pipeline);


        console.log(orders);
        console.log("sellerId:", sellerId);
        console.log("pipeline:", JSON.stringify(pipeline, null, 2));

        // Count pipeline for pagination
        const countPipeline = [
            {
                $lookup: {
                    from: 'ServiceQuotation',
                    localField: 'serviceQuotationId',
                    foreignField: '_id',
                    as: 'serviceQuotation'
                }
            },
            {
                $unwind: '$serviceQuotation'
            },
            {
                $match: {
                    'serviceQuotation.seller': new mongoose.Types.ObjectId(sellerId)
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
                        localField: 'serviceQuotation.buyer',
                        foreignField: '_id',
                        as: 'buyer'
                    }
                },
                {
                    $unwind: '$buyer'
                },
                {
                    $match: {
                        $or: [
                            { orderId: { $regex: search, $options: 'i' } },
                            { 'serviceQuotation.title': { $regex: search, $options: 'i' } },
                            { 'buyer.fullName': { $regex: search, $options: 'i' } }
                        ]
                    }
                }
            );
        }

        countPipeline.push({ $count: 'total' });

        const [countResult] = await ServiceOrders.aggregate(countPipeline);
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

export const updateServiceOrderStatus = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { orderId, status, trackingNumber, estimatedDeliveryDate } = validatedData;
        const sellerId = req.user._id;

        const order = await ServiceOrders.findOne({ orderId })
            .populate('serviceQuotationId');

        if (!order) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service order not found');
        }

        if (order.serviceQuotationId.seller.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You do not have access to this service order');
        }

        // Update order
        const updateData = { status };
        
        if (trackingNumber) {
            updateData.trackingNumber = trackingNumber;
        }
        
        if (estimatedDeliveryDate) {
            updateData.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
        }
        
        if (status === 'delivered') {
            updateData.deliveredAt = new Date();
        }
       
        const updatedOrder = await ServiceOrders.findOneAndUpdate(
            { orderId },
            updateData,
            { new: true }
        );

        if (status === 'completed' || status === 'delivered') {
            await ServiceChat.findByIdAndUpdate(order.serviceChatId, {
                phase: 'completed',
                status: 'completed'
            });
        }

        await ServiceMessages.create({
            senderId: sellerId,
            senderModel: 'Seller',
            content: `Service order status updated to: ${status}`,
            chat: order.serviceChatId,
            quotationId: order.serviceQuotationId._id,
            messageType: 'text',
            isRead: false
        });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: 'Service order status updated successfully',
                order: updatedOrder
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const getServiceOrderById = async (req, res) => {
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
                    from: 'ServiceQuotation',
                    localField: 'serviceQuotationId',
                    foreignField: '_id',
                    as: 'serviceQuotation'
                }
            },
            {
                $unwind: '$serviceQuotation'
            },
            {
                $match: {
                    'serviceQuotation.seller': new mongoose.Types.ObjectId(sellerId)
                }
            },
            {
                $lookup: {
                    from: 'Buyer',
                    localField: 'serviceQuotation.buyer',
                    foreignField: '_id',
                    as: 'buyer'
                }
            },
            {
                $unwind: '$buyer'
            },
            {
                $lookup: {
                    from: 'Service',
                    localField: 'serviceQuotation.serviceId',
                    foreignField: '_id',
                    as: 'service'
                }
            },
            {
                $unwind: '$service'
            },
            {
                $lookup: {
                    from: 'ServiceMedia',
                    localField: 'service._id',
                    foreignField: 'serviceId',
                    as: 'serviceMedia'
                }
            },
            {
                $unwind: {
                    path: '$serviceMedia',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'ServiceChat',
                    localField: 'serviceChatId',
                    foreignField: '_id',
                    as: 'serviceChat'
                }
            },
            {
                $unwind: '$serviceChat'
            },
            {
                $lookup: {
                    from: 'ServiceInvoice',
                    localField: 'serviceInvoiceId',
                    foreignField: '_id',
                    as: 'serviceInvoice'
                }
            },
            {
                $unwind: '$serviceInvoice'
            },
            {
                $project: {
                    orderId: 1,
                    status: 1,
                    finalPrice: 1,
                    trackingNumber: 1,
                    estimatedDeliveryDate: 1,
                    deliveredAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    billingAddress: 1,
                    shippingAddress: 1,
                    
                    // COMPLETE BUYER DATA
                    buyer: {
                        _id: '$buyer._id',
                        fullName: '$buyer.fullName',
                        email: '$buyer.email',
                        phone: '$buyer.phone',
                        profilePic: '$buyer.profilePic',
                        avatar: '$buyer.avatar',
                        companyName: '$buyer.companyName'
                    },
                    
                    service: {
                        _id: '$service._id',
                        name: '$service.name',
                        description: '$service.description',
                        category: '$service.category',
                        images: '$serviceMedia.images'
                    },
                    
                    serviceQuotation: {
                        _id: '$serviceQuotation._id',
                        title: '$serviceQuotation.title',
                        description: '$serviceQuotation.description',
                        minPrice: '$serviceQuotation.minPrice',
                        maxPrice: '$serviceQuotation.maxPrice',
                        deadline: '$serviceQuotation.deadline',
                        requirements: '$serviceQuotation.requirements',
                        createdAt: '$serviceQuotation.createdAt'
                    },
                    
                    serviceInvoice: {
                        _id: '$serviceInvoice._id',
                        totalAmount: '$serviceInvoice.totalAmount',
                        taxAmount: '$serviceInvoice.taxAmount',
                        paymentTerms: '$serviceInvoice.paymentTerms',
                        deliveryTerms: '$serviceInvoice.deliveryTerms',
                        createdAt: '$serviceInvoice.createdAt'
                    },
                    
                    // SERVICE CHAT DATA
                    serviceChat: {
                        _id: '$serviceChat._id',
                        phase: '$serviceChat.phase',
                        status: '$serviceChat.status'
                    }
                }
            }
        ];

        const [order] = await ServiceOrders.aggregate(pipeline);

        if (!order) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service order not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, order)
        );

    } catch (err) {
        handleError(res, err);
    }
};



