import ServiceOrders from '../models/service-order.schema.js';
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
                    'serviceQuotation.sellerId': new mongoose.Types.ObjectId(sellerId)
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
                    localField: 'serviceQuotation.buyerId',
                    foreignField: '_id',
                    as: 'buyer'
                }
            },
            {
                $unwind: '$buyer'
            }
        );

        // Add search filter if provided
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { orderId: { $regex: search, $options: 'i' } },
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
                    serviceType: 1,
                    deliveryMethod: 1,
                    expectedDeliveryDate: 1,
                    actualDeliveryDate: 1,
                    deliveredAt: 1,
                    createdAt: 1,
                    'buyer.fullName': 1,
                    'buyer.avatar': 1,
                    'buyer.profilePic': 1,
                    'serviceQuotation.title': 1,
                    'serviceQuotation.description': 1,
                    'serviceQuotation.minPrice': 1,
                    'serviceQuotation.maxPrice': 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: effectiveLimit }
        );

        const orders = await ServiceOrders.aggregate(pipeline);

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
                    'serviceQuotation.sellerId': new mongoose.Types.ObjectId(sellerId)
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
                        localField: 'serviceQuotation.buyerId',
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
        const { orderId, status, expectedDeliveryDate, milestones } = validatedData;
        const sellerId = req.user._id;

        const order = await ServiceOrders.findOne({ orderId })
            .populate('serviceQuotationId');

        if (!order) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service order not found');
        }

        if (order.serviceQuotationId.sellerId.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You do not have access to this service order');
        }

        // Update order
        const updateData = { status };
        if (expectedDeliveryDate) updateData.expectedDeliveryDate = expectedDeliveryDate;
        if (status === 'delivered') updateData.deliveredAt = new Date();
        if (status === 'completed') updateData.actualDeliveryDate = new Date();
        if (milestones) updateData.milestones = milestones;

        const updatedOrder = await ServiceOrders.findOneAndUpdate(
            { orderId },
            updateData,
            { new: true }
        );

        // Update service chat status if completed
        if (status === 'completed' || status === 'delivered') {
            await ServiceChat.findByIdAndUpdate(order.serviceChatId, {
                phase: 'completed',
                status: 'completed'
            });
        }

        // Create service message
        await ServiceMessages.create({
            senderId: sellerId,
            senderModel: 'Seller',
            content: `Service order status updated to: ${status}${expectedDeliveryDate ? `. Expected delivery: ${expectedDeliveryDate}` : ''}`,
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
                    'serviceQuotation.sellerId': new mongoose.Types.ObjectId(sellerId)
                }
            },
            {
                $lookup: {
                    from: 'Buyer',
                    localField: 'serviceQuotation.buyerId',
                    foreignField: '_id',
                    as: 'buyer'
                }
            },
            {
                $unwind: '$buyer'
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
                    serviceType: 1,
                    deliveryMethod: 1,
                    expectedDeliveryDate: 1,
                    actualDeliveryDate: 1,
                    deliveredAt: 1,
                    milestones: 1,
                    deliverables: 1,
                    feedback: 1,
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

export const addServiceOrderDeliverable = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { orderId, name, description, fileUrl } = validatedData;
        const sellerId = req.user._id;

        const order = await ServiceOrders.findOne({ orderId })
            .populate('serviceQuotationId');

        if (!order) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service order not found');
        }

        if (order.serviceQuotationId.sellerId.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You do not have access to this service order');
        }

        const deliverable = {
            name,
            description,
            fileUrl,
            deliveredAt: new Date()
        };

        const updatedOrder = await ServiceOrders.findOneAndUpdate(
            { orderId },
            { $push: { deliverables: deliverable } },
            { new: true }
        );

        // Create service message about deliverable
        await ServiceMessages.create({
            senderId: sellerId,
            senderModel: 'Seller',
            content: `New deliverable added: ${name}`,
            chat: order.serviceChatId,
            quotationId: order.serviceQuotationId._id,
            messageType: 'text',
            isRead: false
        });

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: 'Deliverable added successfully',
                order: updatedOrder
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const updateServiceOrderMilestone = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { orderId, milestoneId, status } = validatedData;
        const sellerId = req.user._id;

        const order = await ServiceOrders.findOne({ orderId })
            .populate('serviceQuotationId');

        if (!order) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service order not found');
        }

        if (order.serviceQuotationId.sellerId.toString() !== sellerId.toString()) {
            throw buildErrorObject(httpStatus.FORBIDDEN, 'You do not have access to this service order');
        }

        const updateData = {
            'milestones.$.status': status
        };

        if (status === 'completed') {
            updateData['milestones.$.completedAt'] = new Date();
        }

        const updatedOrder = await ServiceOrders.findOneAndUpdate(
            { orderId, 'milestones._id': milestoneId },
            updateData,
            { new: true }
        );

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: 'Milestone updated successfully',
                order: updatedOrder
            })
        );

    } catch (err) {
        handleError(res, err);
    }
};