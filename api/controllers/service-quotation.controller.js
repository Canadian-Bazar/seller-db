import ServiceQuotation from '../models/service-quotations.schema.js';
import buildResponse from '../utils/buildResponse.js';
import handleError from '../utils/handleError.js';
import httpStatus from 'http-status';
import buildErrorObject from '../utils/buildErrorObject.js';
import sendNotification from '../helpers/sendNotification.js';
import notificationMessages from '../utils/notificationMessages.js';
import { matchedData } from 'express-validator';
import ServiceChat from '../models/service-chat.schema.js';
import Message from '../models/messages.schema.js';
import mongoose from 'mongoose';
import Invoice from '../models/invoice.schema.js';
import Orders from '../models/orders.schema.js';
import BuyerAddress from '../models/buyer-address.schema.js';

const generateOrderId = () => {
    return 'SRV-ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

export const getAllServiceQuotationsController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    let { page = 1, limit = 10, status, search, serviceIds, seen } = validatedData;

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

    if (serviceIds && Array.isArray(serviceIds)) {
      filter.serviceId = { $in: serviceIds };
    }

    const skip = (page - 1) * limit;
    const sortOrder = { seen: 1, createdAt: -1 };

    const totalQuotations = await ServiceQuotation.countDocuments(filter);

    const pipeline = [
      { $match: filter },
      
      {
        $lookup: {
          from: 'Service',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      {
        $unwind: {
          path: '$serviceDetails',
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
          from: 'ServiceChat',
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
      
      {
        $project: {
          _id: 1,
          status: 1,
          minPrice: 1,
          maxPrice: 1,
          attributes: 1,
          deadline: 1,
          description: 1,
          seen: 1,
          createdAt: 1,
          
          serviceName: '$serviceDetails.name',
          serviceImage: { $arrayElemAt: ['$serviceDetails.images', 0] },
          
          buyerName: '$buyerDetails.fullName',
          buyerProfilePic: '$buyerDetails.profilePic',
          buyerAvatar: '$buyerDetails.avatar',
          
          chatPhase: '$chatDetails.phase',
          chatId: '$chatDetails._id',
          
          hasActiveInvoice: { $cond: { if: '$invoiceDetails', then: true, else: false } },
          invoiceStatus: '$chatDetails.activeInvoice.status',
          invoiceAmount: '$invoiceDetails.totalAmount',
          
          hasOrder: { $cond: { if: '$orderDetails', then: true, else: false } },
          orderId: '$orderDetails.orderId',
          orderStatus: '$orderDetails.status',
          
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

    const quotations = await ServiceQuotation.aggregate(pipeline);

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

export const acceptServiceQuotationController = async (req, res) => {
    const validatedData = matchedData(req)
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const { quotationId } = validatedData;

            const quotation = await ServiceQuotation.findOne({ 
                _id: quotationId, 
                status: { $in: ['pending', 'negotiation'] }, 
                seller: req.user._id 
            }).populate('seller').session(session);
            
            if (!quotation) {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Service quotation not found or already processed');
            }

            const previousStatus = quotation.status;
            
            quotation.status = 'accepted';
            await quotation.save({ session });

            const buyer = quotation.buyer;
            const seller = quotation.seller._id;

            if (previousStatus === 'pending') {
                let existingChat = await ServiceChat.findOne({ quotation: quotationId }).session(session);

                if (!existingChat) {
                    existingChat = await ServiceChat.create([{ 
                        buyer, 
                        seller,
                        quotation: quotationId,
                        phase: 'order_created',
                        status: 'active',
                        unreadBy: 'buyer'
                    }], { session });
                    
                    existingChat = existingChat[0];
                    console.log("✅ New service chat created:", existingChat._id);

                    await Message.create([{
                        senderId: seller,
                        senderModel: 'Seller',
                        content: 'New Service Quotation Created',
                        chat: existingChat._id,
                        quotationId: quotation._id,
                        messageType: 'quotation_created',
                        isRead: false
                    }], { session });
                }

                await Message.create([{
                    senderId: seller,
                    senderModel: 'Seller',
                    content: 'Service Quotation Accepted',
                    chat: existingChat._id,
                    quotationId: quotation._id,
                    messageType: 'quotation_accepted',
                    isRead: false
                }], { session });

                const newMessage = await Message.create([{
                    senderId: seller,
                    senderModel: 'Seller',
                    content: "I've accepted your service quotation request. Let's proceed with the next steps.",
                    chat: existingChat._id,
                    quotationId: quotation._id,
                    messageType: 'text',
                    isRead: false
                }], { session });

                existingChat.lastMessage = newMessage[0]._id;
                existingChat.unreadBy = 'buyer';
                await existingChat.save({ session });

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

                await ServiceChat.findByIdAndUpdate(existingChat._id, {
                    phase: 'invoice_accepted',
                    activeInvoice: {
                        invoice: invoice[0]._id,
                        status: 'accepted',
                        createdAt: new Date(),
                        respondedAt: new Date()
                    }
                }, { session });

                const orderData = {
                    orderId: generateOrderId(),
                    quotationId: quotation._id,
                    invoiceId: invoice[0]._id,
                    chatId: existingChat._id,
                    finalPrice: quotation.maxPrice,
                    paymentMethod: 'pending',
                    paymentStatus: 'pending',
                    status: 'pending'
                };

                const order = await Orders.create([orderData], { session });

                await ServiceChat.findByIdAndUpdate(existingChat._id, {
                    phase: 'order_created',
                    order: order[0]._id
                }, { session });

                req.notificationData = {
                    recipient: buyer,
                    sender: {
                        model: 'Seller',
                        id: seller,
                        name: quotation.seller.companyName,
                        image: quotation.seller.profileImage || null
                    },
                    type: 'service_quote_accepted',
                    message: notificationMessages.buyer.quotationAccepted
                };

                req.responseData = {
                    message: 'Service quotation accepted successfully',
                    orderId: order[0].orderId,
                    invoiceId: invoice[0]._id,
                    chatId: existingChat._id
                };
            } else {
                req.notificationData = {
                    recipient: buyer,
                    sender: {
                        model: 'Seller',
                        id: seller,
                        name: quotation.seller.companyName,
                        image: quotation.seller.profileImage || null
                    },
                    type: 'service_quote_accepted',
                    message: notificationMessages.buyer.quotationAccepted
                };

                req.responseData = {
                    message: 'Service quotation accepted successfully'
                };
            }
        });

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

export const rejectServiceQuotationController = async (req, res) => {
    const session = await mongoose.startSession();
    const validatedData = matchedData(req);
    
    try {
        await session.withTransaction(async () => {
            const { quotationId } = validatedData;

            const quotation = await ServiceQuotation.findOne({ 
                _id: quotationId, 
                status: { $in: ['pending', 'negotiation'] }, 
                seller: req.user._id 
            }).populate('seller').session(session);
            
            if (!quotation) {
                throw buildErrorObject(httpStatus.BAD_REQUEST, 'Service quotation not found or already processed');
            }

            quotation.status = 'rejected';
            await quotation.save({ session });

            const buyer = quotation.buyer;
            const seller = quotation.seller._id;

            req.notificationData = {
                recipient: buyer,
                sender: {
                    model: 'Seller',
                    id: seller,
                    name: quotation.seller.companyName,
                    image: quotation.seller.profileImage || null
                },
                type: 'service_quote_rejected',
                message: notificationMessages.buyer.quotationRejected
            };
        });

        if (req.notificationData) {
            await sendNotification(req.notificationData);
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Service quotation rejected successfully')
        );

    } catch (err) {
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};

export const negotiateServiceQuotationController = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();

        const validatedData = matchedData(req);
        const { quotationId } = validatedData;
        const sellerId = req.user._id;

        const quotation = await ServiceQuotation.findOne({ 
            _id: quotationId, 
            status: { $in: ['pending'] }, 
            seller: sellerId 
        }).populate('seller').session(session);

        if (!quotation) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Service quotation not found or already processed');
        }

        const buyerId = quotation.buyer;

        await ServiceQuotation.findByIdAndUpdate(
            quotationId,
            { status: 'negotiation' },
            { session }
        );

        let chat = await ServiceChat.findOne({ quotation: quotationId }).session(session);

        if (!chat) {
            const chatArray = await ServiceChat.create([{ 
                buyer: buyerId, 
                seller: sellerId,
                quotation: quotationId,
                phase: 'negotiation',
                status: 'active',
                unreadBy: 'buyer'
            }], { session });
            
            chat = chatArray[0];
            console.log("✅ New service chat created:", chat._id);
        } else {
            if (chat.phase === 'invoice_rejected') {
                await ServiceChat.findByIdAndUpdate(
                    chat._id,
                    { phase: 'negotiation' },
                    { session }
                );
            }
        }

        const negotiationMessageArray = await Message.create([{
            senderId: sellerId,
            senderModel: 'Seller',
            content: "",
            chat: chat._id,
            quotationId: quotation._id,
            messageType: 'text',
            isRead: false
        }], { session });

        const negotiationMessage = negotiationMessageArray[0];

        await ServiceChat.findByIdAndUpdate(
            chat._id,
            { 
                lastMessage: negotiationMessage._id,
                unreadBy: 'buyer' 
            },
            { session }
        );

        await session.commitTransaction();

        const notificationData = {
            recipient: quotation.buyer,
            sender: {
                model: 'Seller',
                id: sellerId,
                name: quotation.seller.companyName,
                image: quotation.seller.logo || null
            },
            type: 'service_negotiation',
            title: 'Service quotation moved to negotiation state',
            message: `${quotation.seller.companyName} wants to negotiate with you about your recent service quotation`,
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
                message: 'Service negotiation started successfully',
                chatId: chat._id
            })
        );

    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        handleError(res, err);
    } finally {
        await session.endSession();
    }
};

export const getServiceQuotationById = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const validatedData = matchedData(req);
            const userId = req.user._id;

            const pipeline = [
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(validatedData.quotationId),
                        seller: new mongoose.Types.ObjectId(userId)
                    }
                },
                
                {
                    $lookup: {
                        from: 'Service',
                        localField: 'serviceId',
                        foreignField: '_id',
                        as: 'serviceDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$serviceDetails',
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
                        from: 'ServiceChat',
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

            const [quotation] = await ServiceQuotation.aggregate(pipeline).session(session);

            if (!quotation) {
                throw buildErrorObject(httpStatus.NOT_FOUND, 'Service quotation not found');
            }

            await ServiceQuotation.findByIdAndUpdate(
                validatedData.quotationId, 
                { seen: true }, 
                { session }
            );

            req.quotationData = quotation;
        });

        const quotation = req.quotationData;
        const response = {
            _id: quotation._id,
            status: quotation.status,
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
            
            serviceName: quotation.serviceDetails?.name,
            serviceImages: quotation.serviceDetails?.images?.slice(0, 3),
            
            buyerName: quotation.buyerDetails?.fullName,
            buyerProfilePic: quotation.buyerDetails?.profilePic,
            buyerAvatar: quotation.buyerDetails?.avatar,
            
            chatId: quotation.chatDetails?._id,
            chatPhase: quotation.chatDetails?.phase,
            
            activeInvoice: quotation.invoiceDetails ? {
                _id: quotation.invoiceDetails._id,
                status: quotation.chatDetails?.activeInvoice?.status,
                amount: quotation.invoiceDetails.totalAmount,
                negotiatedPrice: quotation.invoiceDetails.negotiatedPrice,
                createdAt: quotation.chatDetails?.activeInvoice?.createdAt
            } : null,
            
            order: quotation.orderDetails ? {
                _id: quotation.orderDetails._id,
                orderId: quotation.orderDetails.orderId,
                status: quotation.orderDetails.status,
                finalPrice: quotation.orderDetails.finalPrice,
                createdAt: quotation.orderDetails.createdAt
            } : null,
            
            businessStatus: quotation.chatDetails?.phase || quotation.status,
            
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