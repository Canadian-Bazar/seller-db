import Quotation from '../models/quotations.schema.js';
import buildResponse from '../utils/buildResponse.js';
import handleError from '../utils/handleError.js';
import httpStatus from 'http-status';
import buildErrorObject from '../utils/buildErrorObject.js';
import sendNotification from '../helpers/sendNotification.js';
import notificationMessages from '../utils/notificationMessages.js';
import { matchedData } from 'express-validator';
import Chat from '../models/chat.schema.js';
import Message from '../models/messages.schema.js';
import mongoose from 'mongoose';
import Invoice from '../models/invoice.schema.js';
import Orders from '../models/orders.schema.js';
import BuyerAddress from '../models/buyer-address.schema.js';

/**
 * Retrieves a paginated list of quotations for seller.
 * Enhanced with chat phase information and invoice/order status.
 */

const generateOrderId = () => {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

export const getAllQuotationsController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    let { page = 1, limit = 10, status, search, productIds, seen } = validatedData;

    const userId = req.user._id;

    limit = Math.min(Number(limit), 50);
    page = Number(page);

    const filter = {
      seller: new mongoose.Types.ObjectId(userId)
    };

    if (status) {
      filter.status = status;
    }

    if (seen !== undefined) {
      filter.seen = seen === 'true' || seen === true;
    }

    if (productIds && Array.isArray(productIds)) {
      filter.productId = { $in: productIds };
    }

    const skip = (page - 1) * limit;
    const sortOrder = { seen: 1, createdAt: -1 };

    const totalQuotations = await Quotation.countDocuments(filter);

    // Enhanced aggregation pipeline with chat and order info
    const pipeline = [
      { $match: filter },
      
      // Lookup product details
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
      
      // Lookup buyer details
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
      
      // Lookup chat to get phase and invoice/order info
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
      
      // Lookup active invoice if exists
      {
        $lookup: {
          from: 'Invoice',
          localField: 'chatDetails.activeInvoice.invoice',
          foreignField: '_id',
          as: 'invoiceDetails'
        }
      },
      {
        $unwind: {
          path: '$invoiceDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Lookup order if exists
      {
        $lookup: {
          from: 'Orders',
          localField: 'chatDetails.order',
          foreignField: '_id',
          as: 'orderDetails'
        }
      },
      {
        $unwind: {
          path: '$orderDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Project the final structure
      {
        $project: {
          _id: 1,
          status: 1,
          quantity: 1,
          minPrice: 1,
          maxPrice: 1,
          attributes: 1,
          deadline: 1,
          description: 1,
          seen: 1,
          createdAt: 1,
          
          // Product info
          productName: '$productDetails.name',
          productImage: { $arrayElemAt: ['$productDetails.images', 0] },
          
          // Buyer info
          buyerName: '$buyerDetails.fullName',
          buyerProfilePic: '$buyerDetails.profilePic',
          buyerAvatar: '$buyerDetails.avatar',
          
          // Chat and business logic info
          chatPhase: '$chatDetails.phase',
          chatId: '$chatDetails._id',
          
          // Invoice info
          hasActiveInvoice: { $cond: { if: '$invoiceDetails', then: true, else: false } },
          invoiceStatus: '$chatDetails.activeInvoice.status',
          invoiceAmount: '$invoiceDetails.totalAmount',
          
          // Order info
          hasOrder: { $cond: { if: '$orderDetails', then: true, else: false } },
          orderId: '$orderDetails.orderId',
          orderStatus: '$orderDetails.status',
          
          // Business status derived from phase
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
      
      { $sort: sortOrder },
      { $skip: skip },
      { $limit: limit }
    ];

    const quotations = await Quotation.aggregate(pipeline);

    const response = {
      docs: quotations,
      hasPrev: page > 1,
      hasNext: skip + limit < totalQuotations,
      totalPages: Math.ceil(totalQuotations / limit),
    };

    res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
  } catch (err) {
    handleError(res, err);
  }
};

export const acceptQuotationController = async (req, res) => {
    const validatedData = matchedData(req)
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const { quotationId } = validatedData;

            const quotation = await Quotation.findOne({ 
                _id: quotationId, 
                status: { $in: ['pending', 'negotiation'] }, 
                seller: req.user._id 
            }).populate('seller').session(session);
            
            if (!quotation) {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Quotation not found or already processed');
            }

            const previousStatus = quotation.status;
            
            quotation.status = 'accepted';
            await quotation.save({ session });

            const buyer = quotation.buyer;
            const seller = quotation.seller._id;

            if (previousStatus === 'pending') {
                let existingChat = await Chat.findOne({ quotation: quotationId }).session(session);

                if (!existingChat) {
                    // Create new chat
                    existingChat = await Chat.create([{ 
                        buyer, 
                        seller,
                        quotation: quotationId,
                        phase: 'order_created',
                        status: 'active',
                        unreadBy: 'buyer'
                    }], { session });
                    
                    existingChat = existingChat[0]; // Extract from array
                    console.log("✅ New chat created:", existingChat._id);

                    // Create system message
                    await Message.create([{
                        senderId: seller,
                        senderModel: 'Seller',
                        content: 'New Quotation Created',
                        chat: existingChat._id,
                        quotationId: quotation._id,
                        messageType: 'quotation_created',
                        isRead: false
                    }], { session });
                }

                // Create acceptance message
                await Message.create([{
                    senderId: seller,
                    senderModel: 'Seller',
                    content: 'Quotation Accepted',
                    chat: existingChat._id,
                    quotationId: quotation._id,
                    messageType: 'quotation_accepted',
                    isRead: false
                }], { session });

                const newMessage = await Message.create([{
                    senderId: seller,
                    senderModel: 'Seller',
                    content: "I've accepted your quotation request. Let's proceed with the next steps.",
                    chat: existingChat._id,
                    quotationId: quotation._id,
                    messageType: 'text',
                    isRead: false
                }], { session });

                // Update chat with last message
                existingChat.lastMessage = newMessage[0]._id;
                existingChat.unreadBy = 'buyer';
                await existingChat.save({ session });

                // Create invoice automatically
                const invoiceData = {
                    quotationId: quotation._id,
                    chatId: existingChat._id,
                    sellerId: seller,
                    buyerId: buyer,
                    negotiatedPrice: quotation.maxPrice,
                    totalAmount: quotation.maxPrice,
                    paymentTerms: 'Payment on delivery',
                    deliveryTerms: 'Standard delivery',
                    status: 'accepted',
                    acceptedAt: new Date()
                };

                const invoice = await Invoice.create([invoiceData], { session });

                // Update chat with invoice info
                await Chat.findByIdAndUpdate(existingChat._id, {
                    phase: 'invoice_accepted',
                    activeInvoice: {
                        invoice: invoice[0]._id,
                        status: 'accepted',
                        createdAt: new Date(),
                        respondedAt: new Date()
                    }
                }, { session });

                // Fetch buyer's default addresses
                const [billingAddress, shippingAddress] = await Promise.all([
                    BuyerAddress.findOne({ 
                        buyerId: buyer, 
                        addressType: 'Billing', 
                        isDefault: true 
                    }).session(session),
                    BuyerAddress.findOne({ 
                        buyerId: buyer, 
                        addressType: 'Shipping', 
                        isDefault: true 
                    }).session(session)
                ]);

                if (!billingAddress) {
                    throw buildErrorObject(httpStatus.BAD_REQUEST, 'Buyer must have a default billing address');
                }

                if (!shippingAddress) {
                    throw buildErrorObject(httpStatus.BAD_REQUEST, 'Buyer must have a default shipping address');
                }

                // Create order
                const orderData = {
                    orderId: generateOrderId(),
                    quotationId: quotation._id,
                    invoiceId: invoice[0]._id,
                    chatId: existingChat._id,
                    finalPrice: quotation.maxPrice,
                    shippingAddress: shippingAddress._id,
                    billingAddress: billingAddress._id,
                    paymentMethod: 'pending',
                    paymentStatus: 'pending',
                    status: 'pending'
                };

                const order = await Orders.create([orderData], { session });

                // Update chat with order info
                await Chat.findByIdAndUpdate(existingChat._id, {
                    phase: 'order_created',
                    order: order[0]._id
                }, { session });

                // Store data for notification (outside transaction)
                req.notificationData = {
                    recipient: buyer,
                    sender: {
                        model: 'Seller',
                        id: seller,
                        name: quotation.seller.companyName,
                        image: quotation.seller.profileImage || null
                    },
                    type: 'quote_accepted',
                    message: notificationMessages.buyer.quotationAccepted
                };

                req.responseData = {
                    message: 'Quotation accepted successfully',
                    orderId: order[0].orderId,
                    invoiceId: invoice[0]._id,
                    chatId: existingChat._id
                };
            } else {
                // Store data for notification (outside transaction)
                req.notificationData = {
                    recipient: buyer,
                    sender: {
                        model: 'Seller',
                        id: seller,
                        name: quotation.seller.companyName,
                        image: quotation.seller.profileImage || null
                    },
                    type: 'quote_accepted',
                    message: notificationMessages.buyer.quotationAccepted
                };

                req.responseData = {
                    message: 'Quotation accepted successfully'
                };
            }
        });

        // Send notification after transaction completes
        if (req.notificationData) {
            await sendNotification(req.notificationData);
        }

        return res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, req.responseData)
        );

    } catch (err) {
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};

export const rejectQuotationController = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const { quotationId } = validatedData;

            const quotation = await Quotation.findOne({ 
                _id: quotationId, 
                status: { $in: ['pending', 'negotiation'] }, 
                seller: req.user._id 
            }).populate('seller').session(session);
            
            if (!quotation) {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Quotation not found or already processed');
            }

            // Update quotation status to rejected
            quotation.status = 'rejected';
            await quotation.save({ session });

            const buyer = quotation.buyer;
            const seller = quotation.seller._id;

            // Store notification data for after transaction
            req.notificationData = {
                recipient: buyer,
                sender: {
                    model: 'Seller',
                    id: seller,
                    name: quotation.seller.companyName,
                    image: quotation.seller.profileImage || null
                },
                type: 'quote_rejected',
                message: notificationMessages.buyer.quotationRejected
            };
        });

        // Send notification after transaction completes
        if (req.notificationData) {
            await sendNotification(req.notificationData);
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Quotation rejected successfully')
        );

    } catch (err) {
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};

export const negotiateQuotationController = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();

        const validatedData = matchedData(req);
        const { quotationId } = validatedData;


        const sellerId = req.user._id;

        console.log(quotationId)

        const quotation = await Quotation.findOne({ 
            _id: quotationId, 
            status: { $in: ['pending'] }, 
            seller: sellerId 
        }).populate('seller').session(session);

        console.log(quotation)
        
        if (!quotation) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Quotation not found or already processed');
        }

        const buyerId = quotation.buyer;

        await Quotation.findByIdAndUpdate(
            quotationId,
            { status: 'negotiation' },
            { session }
        );

        // Check for existing chat
        let chat = await Chat.findOne({ quotation: quotationId }).session(session);

        if (!chat) {
            const chatArray = await Chat.create([{ 
                buyer: buyerId, 
                seller: sellerId,
                quotation: quotationId,
                phase: 'negotiation',
                status: 'active',
                unreadBy: 'buyer'
            }], { session });
            
            chat = chatArray[0];
            console.log("✅ New chat created:", chat._id);

            // const systemMessageArray = await Message.create([{
            //     senderId: sellerId,
            //     senderModel: 'Seller',
            //     content: 'New Quotation Created',
            //     chat: chat._id,
            //     quotationId: quotation._id,
            //     messageType: 'quotation_created',
            //     isRead: false
            // }], { session });

        } else {
            if (chat.phase === 'invoice_rejected') {
                await Chat.findByIdAndUpdate(
                    chat._id,
                    { phase: 'negotiation' },
                    { session }
                );
            }
        }

        const negotiationMessageArray = await Message.create([{
            senderId: sellerId,
            senderModel: 'Seller',
            content: "I'd like to discuss some adjustments to the quotation. Let's negotiate the terms.",
            chat: chat._id,
            quotationId: quotation._id,
            messageType: 'text',
            isRead: false
        }], { session });

        const negotiationMessage = negotiationMessageArray[0];

        await Chat.findByIdAndUpdate(
            chat._id,
            { 
                lastMessage: negotiationMessage._id,
                unreadBy: 'buyer' 
            },
            { session }
        );

        // Prepare message for Redis (after transaction commits)
        // const messageForRedis = {
        //     senderId: sellerId,
        //     senderModel: 'Seller',
        //     content: "I'd like to discuss some adjustments to the quotation. Let's negotiate the terms.",
        //     chat: chat._id,
        //     quotationId: quotation._id,
        //     messageType: 'text',
        //     isRead: false,
        //     _id: negotiationMessage._id,
        //     createdAt: negotiationMessage.createdAt
        // };

       
        await session.commitTransaction();

         const notificationData = {
            recipient: quotation.buyer,
            sender: {
                model: 'Seller',
                id: sellerId,
                name: quotation.seller.companyName,
                image: quotation.seller.logo || null
            },
            type: 'negotiation',
            title: 'Quotation moved to negotiation state',
            message: `${quotation.seller.companyName} wants to negotiate with you about your recent quotation`,
            data: {
                chatId: chat._id,
                quotationId: quotationId,
                
            }
        };

        try {
            await sendNotification(notificationData);
        } catch (notificationError) {
            console.error('Notification error (non-blocking):', notificationError);
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, {
                message: 'Negotiation started successfully',
                chatId: chat._id
            })
        );

    } catch (err) {
        // Only abort if transaction is still active
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};

export const getQuotationById = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const validatedData = matchedData(req);
            const userId = req.user._id;

            console.log(validatedData);

            // Enhanced aggregation to get quotation with chat, invoice, and order info
            const pipeline = [
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(validatedData.quotationId),
                        seller: new mongoose.Types.ObjectId(userId)
                    }
                },
                
                // Lookup product details
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
                
                // Lookup buyer details
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
                
                // Lookup chat details
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
                
                // Lookup invoice details if exists
                {
                    $lookup: {
                        from: 'Invoice',
                        localField: 'chatDetails.activeInvoice.invoice',
                        foreignField: '_id',
                        as: 'invoiceDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$invoiceDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                
                // Lookup order details if exists
                {
                    $lookup: {
                        from: 'Orders',
                        localField: 'chatDetails.order',
                        foreignField: '_id',
                        as: 'orderDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$orderDetails',
                        preserveNullAndEmptyArrays: true
                    }
                }
            ];

            const [quotation] = await Quotation.aggregate(pipeline).session(session);

            if (!quotation) {
                throw buildErrorObject(httpStatus.NOT_FOUND, 'Quotation not found');
            }

            // Mark as seen
            await Quotation.findByIdAndUpdate(
                validatedData.quotationId, 
                { seen: true }, 
                { session }
            );

            req.quotationData = quotation;
        });

        // Prepare response data
        const quotation = req.quotationData;
        const response = {
            _id: quotation._id,
            status: quotation.status,
            quantity: quotation.quantity,
            minPrice: quotation.minPrice,
            maxPrice: quotation.maxPrice,
            deadline: quotation.deadline,
            description: quotation.description,
            attributes: quotation.attributes,
            state: quotation.state,
            pinCode: quotation.pinCode,
            seen: true,
            createdAt: quotation.createdAt,
            updatedAt: quotation.updatedAt,
            
            // Product info
            productName: quotation.productDetails?.name,
            productImages: quotation.productDetails?.images?.slice(0, 3),
            
            // Buyer info
            buyerName: quotation.buyerDetails?.fullName,
            buyerProfilePic: quotation.buyerDetails?.profilePic,
            buyerAvatar: quotation.buyerDetails?.avatar,
            
            // Chat and business logic info
            chatId: quotation.chatDetails?._id,
            chatPhase: quotation.chatDetails?.phase,
            
            // Invoice info
            activeInvoice: quotation.invoiceDetails ? {
                _id: quotation.invoiceDetails._id,
                status: quotation.chatDetails?.activeInvoice?.status,
                amount: quotation.invoiceDetails.totalAmount,
                negotiatedPrice: quotation.invoiceDetails.negotiatedPrice,
                createdAt: quotation.chatDetails?.activeInvoice?.createdAt
            } : null,
            
            // Order info
            order: quotation.orderDetails ? {
                _id: quotation.orderDetails._id,
                orderId: quotation.orderDetails.orderId,
                status: quotation.orderDetails.status,
                finalPrice: quotation.orderDetails.finalPrice,
                createdAt: quotation.orderDetails.createdAt
            } : null,
            
            // Business status for frontend
            businessStatus: quotation.chatDetails?.phase || quotation.status,
            
            // Action buttons for frontend
            canCreateInvoice: quotation.chatDetails?.phase === 'negotiation' && !quotation.invoiceDetails,
            canUpdateInvoice: quotation.chatDetails?.phase === 'invoice_sent' && quotation.invoiceDetails?.status === 'pending',
            canUpdateOrder: quotation.orderDetails && ['pending', 'confirmed', 'processing'].includes(quotation.orderDetails.status)
        };

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));

    } catch (err) {
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};