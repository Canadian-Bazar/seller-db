import Product from '../models/products.schema.js';
import Orders from '../models/orders.schema.js';
import Quotation from '../models/quotations.schema.js';
import Chat from '../models/chat.schema.js';
import handleError from '../utils/handleError.js';
import buildResponse from '../utils/buildResponse.js';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { redisClient } from '../redis/redis.config.js';

export const getDashboardStats = async (req, res) => {
    try {
        const sellerId = new mongoose.Types.ObjectId(req.user._id);

        const [
            totalActiveProducts,
            totalOrdersReceived,
            ordersInProgress,
            recentQuotations,
            recentOrders,
            chatsWithUnseenMessages
        ] = await Promise.all([
            // Total active products
            Product.countDocuments({ 
                seller: sellerId,
                isComplete: true  // Only count complete products
            }),

            // Total orders received
            Orders.aggregate([
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
                        'quotation.seller': sellerId
                    }
                },
                {
                    $count: 'total'
                }
            ]),

            // Orders in progress (not delivered, cancelled, or returned)
            Orders.aggregate([
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
                        'quotation.seller': sellerId,
                        status: {
                            $in: ['pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'in_transit', 'out_for_delivery']
                        }
                    }
                },
                {
                    $count: 'total'
                }
            ]),

            // Recent quotations (top 5 most recent)
            Quotation.aggregate([
                {
                    $match: {
                        seller: sellerId
                    }
                },
                {
                    $lookup: {
                        from: 'Product',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$productDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'Buyer',
                        localField: 'buyer',
                        foreignField: '_id',
                        as: 'buyerDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$buyerDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'Chat',
                        localField: '_id',
                        foreignField: 'quotation',
                        as: 'chatDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$chatDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        status: 1,
                        quantity: 1,
                        minPrice: 1,
                        maxPrice: 1,
                        deadline: 1,
                        description: 1,
                        seen: 1,
                        createdAt: 1,
                        productName: '$productDetails.name',
                        productImage: { $arrayElemAt: ['$productDetails.images', 0] },
                        buyerName: '$buyerDetails.fullName',
                        buyerProfilePic: '$buyerDetails.profilePic',
                        buyerAvatar: '$buyerDetails.avatar',
                        chatPhase: '$chatDetails.phase',
                        businessStatus: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$chatDetails.phase', 'negotiation'] }, then: 'negotiating' },
                                    { case: { $eq: ['$chatDetails.phase', 'invoice_sent'] }, then: 'invoice_pending' },
                                    { case: { $eq: ['$chatDetails.phase', 'invoice_accepted'] }, then: 'order_created' },
                                    { case: { $eq: ['$chatDetails.phase', 'invoice_rejected'] }, then: 'invoice_rejected' },
                                    { case: { $eq: ['$chatDetails.phase', 'completed'] }, then: 'completed' }
                                ],
                                default: { $toString: '$status' }
                            }
                        }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 5 }
            ]),

            // Recent orders (top 5 most recent)
            Orders.aggregate([
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
                        'quotation.seller': sellerId
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
                    $project: {
                        _id: 1,
                        orderId: 1,
                        status: 1,
                        finalPrice: 1,
                        trackingNumber: 1,
                        estimatedDeliveryDate: 1,
                        deliveredAt: 1,
                        createdAt: 1,
                        'buyer.fullName': 1,
                        'buyer.avatar': 1,
                        'buyer.profilePic': 1,
                        'product.name': 1,
                        'product.images': 1,
                        'quotation.quantity': 1
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 5 }
            ]),

            // Chats with unseen messages (top 5)
            Chat.aggregate([
                {
                    $match: {
                        seller: sellerId,
                        status: 'active'
                    }
                },
                {
                    $lookup: {
                        from: 'Message',
                        localField: 'lastMessage',
                        foreignField: '_id',
                        as: 'lastMessage'
                    }
                },
                {
                    $unwind: {
                        path: '$lastMessage',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'Buyer',
                        localField: 'buyer',
                        foreignField: '_id',
                        as: 'buyerDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$buyerDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'Quotation',
                        localField: 'quotation',
                        foreignField: '_id',
                        as: 'quotationDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$quotationDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'Product',
                        localField: 'quotationDetails.productId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$productDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        buyer: 1,
                        seller: 1,
                        phase: 1,
                        createdAt: 1,
                        lastSeenAt: 1,
                        unreadBy: 1,
                        lastMessage: 1,
                        buyerName: '$buyerDetails.fullName',
                        buyerProfilePic: '$buyerDetails.profilePic',
                        buyerAvatar: '$buyerDetails.avatar',
                        productName: '$productDetails.name',
                        productImage: { $arrayElemAt: ['$productDetails.images', 0] }
                    }
                },
                // Filter for chats where seller hasn't seen the latest message
                {
                    $match: {
                        $or: [
                            { unreadBy: 'seller' },
                            {
                                $and: [
                                    { 'lastMessage.senderModel': { $ne: 'Seller' } },
                                    {
                                        $expr: {
                                            $gt: [
                                                '$lastMessage.createdAt',
                                                { $ifNull: ['$lastSeenAt.seller', new Date(0)] }
                                            ]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                },
                { $sort: { 'lastMessage.createdAt': -1 } },
                { $limit: 5 }
            ])
        ]);

        // Process the results and handle Redis for unseen chats
        const stats = {
            totalActiveProducts,
            totalOrdersReceived: totalOrdersReceived[0]?.total || 0,
            ordersInProgress: ordersInProgress[0]?.total || 0
        };

        // Enhance chats with Redis data for more accurate unseen status
        const enhancedChats = [];
        for (let chat of chatsWithUnseenMessages) {
            try {
                // Check Redis for latest messages
                const redisMessages = await redisClient.lRange(`MESSAGEQUEUE:${chat._id}`, -1, -1);
                let finalLastMessage = chat.lastMessage;
                let lastMessageTimestamp = chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt) : new Date(0);

                if (redisMessages.length > 0) {
                    const latestRedisMessage = JSON.parse(redisMessages[0]);
                    const redisMessageTime = new Date(latestRedisMessage.createdAt);
                    
                    if (redisMessageTime > lastMessageTimestamp) {
                        finalLastMessage = {
                            _id: latestRedisMessage._id,
                            content: latestRedisMessage.content,
                            messageType: latestRedisMessage.messageType,
                            senderId: latestRedisMessage.senderId,
                            senderModel: latestRedisMessage.senderModel,
                            createdAt: latestRedisMessage.createdAt,
                            media: latestRedisMessage.media || []
                        };
                        lastMessageTimestamp = redisMessageTime;
                    }
                }

                // Check Redis for seller's last seen
                let sellerLastSeen = chat.lastSeenAt?.seller ? new Date(chat.lastSeenAt.seller) : new Date(0);
                const redisLastSeen = await redisClient.get(`CHAT:LASTSEEN:${chat._id}:seller`);
                if (redisLastSeen) {
                    const redisLastSeenTime = new Date(redisLastSeen);
                    if (redisLastSeenTime > sellerLastSeen) {
                        sellerLastSeen = redisLastSeenTime;
                    }
                }

                // Determine if there are unseen messages
                let hasUnseenMessages = false;
                if (finalLastMessage) {
                    const isOwnMessage = finalLastMessage.senderId?.toString() === sellerId.toString() ||
                                        finalLastMessage.senderModel === 'Seller';
                    
                    if (!isOwnMessage) {
                        hasUnseenMessages = lastMessageTimestamp > sellerLastSeen;
                    }
                }

                // Only include chats with actual unseen messages
                if (hasUnseenMessages) {
                    enhancedChats.push({
                        _id: chat._id,
                        buyer: chat.buyer,
                        seller: chat.seller,
                        phase: chat.phase,
                        createdAt: chat.createdAt,
                        buyerName: chat.buyerName,
                        buyerProfilePic: chat.buyerAvatar || chat.buyerProfilePic,
                        productName: chat.productName,
                        productImage: chat.productImage,
                        lastMessage: finalLastMessage,
                        hasUnseenMessages: true,
                        lastMessageAt: lastMessageTimestamp
                    });
                }
            } catch (redisError) {
                console.error(`Error processing Redis data for chat ${chat._id}:`, redisError);
                
                const dbLastSeen = chat.lastSeenAt?.seller ? new Date(chat.lastSeenAt.seller) : new Date(0);
                const dbMessageTime = chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt) : new Date(0);
                
                let hasUnseenMessages = false;
                if (chat.lastMessage) {
                    const isOwnMessage = chat.lastMessage.senderId?.toString() === sellerId.toString() ||
                                       chat.lastMessage.senderModel === 'Seller';
                    
                    if (!isOwnMessage) {
                        hasUnseenMessages = dbMessageTime > dbLastSeen;
                    }
                }

                if (hasUnseenMessages) {
                    enhancedChats.push({
                        _id: chat._id,
                        buyer: chat.buyer,
                        seller: chat.seller,
                        phase: chat.phase,
                        createdAt: chat.createdAt,
                        buyerName: chat.buyerName,
                        buyerProfilePic: chat.buyerAvatar || chat.buyerProfilePic,
                        productName: chat.productName,
                        productImage: chat.productImage,
                        lastMessage: chat.lastMessage,
                        hasUnseenMessages: true,
                        lastMessageAt: dbMessageTime
                    });
                }
            }
        }

        enhancedChats.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        const topUnseenChats = enhancedChats.slice(0, 5);

        const dashboardData = {
            stats,
            recentQuotations,
            recentOrders,
            unseenChats: topUnseenChats
        };

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, dashboardData));

    } catch (err) {
        console.error('Dashboard stats error:', err);
        handleError(res, err);
    }
};