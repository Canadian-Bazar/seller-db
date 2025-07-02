import Quotation from '../models/quotations.schema.js' ;
import buildResponse from '../utils/buildResponse.js';
import handleError from '../utils/handleError.js';
import httpStatus from 'http-status';
import buildErrorObject from '../utils/buildErrorObject.js';
import { send } from 'process';
import sendNotification from '../helpers/sendNotification.js';
import notificationMessages from '../utils/notificationMessages.js';
import { matchedData } from 'express-validator';
import Chat from '../models/chat.schema.js'
import Message from '../models/messages.schema.js'
import mongoose from 'mongoose';

/**
 * Retrieves a paginated list of quotations.
 *
 * This controller method fetches quotations from the database applying an optional status filter.
 * Pagination is applied using the "page" and "limit" parameters, with "limit" capped at 50 items per page.
 * The response is structured to include additional pagination metadata:
 *   - hasNext: A boolean indicating if there are more pages beyond the current one.
 *   - hasPrev: A boolean indicating if there is a previous page before the current one.
 *   - totalPages: The total number of pages calculated based on the available data.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.query - The query parameters.
 * @param {number} [req.query.page=1] - The current page number for pagination.
 * @param {number} [req.query.limit=10] - The maximum number of quotations to return (capped at 50).
 * @param {string} [req.query.status] - Optional filter for quotations based on their status.
 * @param {Object} res - The Express response object.
 *
 * @returns {void} Sends a JSON response containing the list of quotations along with pagination details.
 *
 * @throws {Error} Propagates any errors encountered during the database query or data processing,
 * which are then handled by the error handler.
 */
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

    const quotations = await Quotation.find(filter)
      .populate({
        path: 'productId',
        select: 'name'
      })
      .populate({
        path: 'buyer',
        select: 'fullName profilePic avatar'
      })
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    const filteredQuotations = quotations.filter(q => q.productId);

    const response = {
      docs: filteredQuotations.map(q => ({
        _id: q._id,
        status: q.status,
        priceRange: {
          min: q.minPrice,
          max: q.maxPrice
        },
        quantity: q.quantity,
        attributes: q.attributes,
        deadline: q.deadline,
        description: q.description,
        seen: q.seen,
        createdAt: q.createdAt,
        productName: q.productId?.name,
        buyerName: q.buyer?.fullName,
        buyerProfilePic: q.buyer?.profilePic,
        buyerAvatar: q.buyer?.avatar
      })),
      hasPrev: page > 1,
      hasNext: skip + limit < totalQuotations,
      totalPages: Math.ceil(totalQuotations / limit),
    };

    res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
  } catch (err) {
    handleError(res, err);
  }
};








export const mutateQuotationStatusController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { quotationId, status } = validatedData;

        const quotation = await Quotation.findOne({ 
            _id: quotationId, 
            status: { $in: ['pending', 'negotiation'] }, 
            seller: req.user._id 
        }).populate('seller');
        
        if (!quotation) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Quotation not found or already processed');
        }

        const previousStatus = quotation.status; 
        
        quotation.status = status;
        await quotation.save();

        const buyer = quotation.buyer;
        const seller = quotation.seller._id;

        if (status === 'rejected' && previousStatus === 'pending') {
            const notificationData = {
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

            await sendNotification(notificationData);

            return res.status(httpStatus.OK).json(
                buildResponse(httpStatus.OK, 'Quotation rejected successfully')
            );
        }

        let existingChat = await Chat.findOne({ buyer, seller });

        console.log("existingChat" , existingChat)
        
        if (!existingChat) {
            existingChat = await Chat.create({ 
                buyer, 
                seller,
                activeQuotation: quotationId,
                quotationHistory: [{
                    quotation: quotationId,
                    startedAt: new Date(),
                    status: status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'pending'
                }],
                status: 'active',
                unreadBy: 'buyer'
            });
        } else {
            if (existingChat.activeQuotation) {
                const historyIndex = existingChat.quotationHistory.findIndex(
                    h => h.quotation.toString() === existingChat.activeQuotation.toString()
                );
                if (historyIndex !== -1) {
                    existingChat.quotationHistory[historyIndex].status = 'completed';
                }
            }
            
            existingChat.activeQuotation = quotationId;
            
            const existsInHistory = existingChat.quotationHistory.some(
                h => h.quotation.toString() === quotationId.toString()
            );
            
            if (!existsInHistory) {
                existingChat.quotationHistory.push({
                    quotation: quotationId,
                    startedAt: new Date(),
                    status: status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'pending'
                });
            } else {
                const historyIndex = existingChat.quotationHistory.findIndex(
                    h => h.quotation.toString() === quotationId.toString()
                );
                if (historyIndex !== -1) {
                    existingChat.quotationHistory[historyIndex].status = 
                        status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'pending';
                }
            }
        }

        let messageContent;
        let messageType;
        let notificationType;
        let notificationContent;
        let newMessage;

        if (status === 'accepted') {
            messageContent = "I've accepted your quotation request. Let's proceed with the next steps.";
            messageType = 'text';
            notificationType = 'quote_accepted';
            notificationContent = notificationMessages.buyer.quotationAccepted;
            
            await Message.create({
                senderId: seller,
                senderModel: 'Seller',
                content: 'Quotation Accepted',
                chat: existingChat._id,
                quotationId: quotation._id,
                messageType: 'quotation_accepted',
                isRead: false
            });
        } else if (status === 'rejected' && previousStatus === 'negotiation') {
            messageContent = "I'm unable to proceed with this quotation at this time.";
            messageType = 'text';
            notificationType = 'quote_rejected';
            notificationContent = notificationMessages.buyer.quotationRejected;
            
            await Message.create({
                senderId: seller,
                senderModel: 'Seller',
                content: 'Quotation Rejected',
                chat: existingChat._id,
                quotationId: quotation._id,
                messageType: 'quotation_rejected',
                isRead: false
            });
        } else { 
            messageContent = "I'd like to discuss some adjustments to the quotation. Let's negotiate the terms.";
            messageType = 'text';
            notificationType = 'quote_negotiation';
            notificationContent = notificationMessages.buyer.quotationNegotiation || 'Seller wants to negotiate your quotation';
        }

        // Create the main status message
        newMessage = await Message.create({
            senderId: seller,
            senderModel: 'Seller',
            content: messageContent,
            chat: existingChat._id,
            quotationId: quotation._id,
            messageType: messageType,
            isRead: false
        });

        // Create quotation_created system message if it's the first interaction
        const messageCount = await Message.countDocuments({ chat: existingChat._id });
        if (messageCount <= 2) {
            await Message.create({
                senderId: seller,
                senderModel: 'Seller',
                content: 'New Quotation Created',
                chat: existingChat._id,
                quotationId: quotation._id,
                messageType: 'quotation_created',
                isRead: false
            });
        }

        // Update chat
        existingChat.lastMessage = newMessage._id;
        existingChat.unreadBy = 'buyer';
        await existingChat.save();

        // Send notification
        const notificationData = {
            recipient: buyer,
            sender: {
                model: 'Seller',
                id: seller,
                name: quotation.seller.companyName,
                image: quotation.seller.profileImage || null
            },
            type: notificationType,
            message: notificationContent
        };

        await sendNotification(notificationData);

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Quotation status updated successfully')
        );
    } catch (err) {
        handleError(res, err);
    }
};



export const getQuotationById = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const userId = req.user._id;


    console.log(validatedData)

    const quotation = await Quotation.findOneAndUpdate(
      {
        _id: validatedData.quotationId,
        seller:userId
      },
      {
        $set: { seen: true }
      },
      { new: true }
    )
      .populate({
        path: 'productId',
        select: 'name images' 
      })
      .populate({
        path: 'buyer',
        select: 'fullName profilePic'
      });

    if (!quotation) {
      return res.status(httpStatus.NOT_FOUND).json(buildResponse(httpStatus.NOT_FOUND,  'Quotation not found' ));
    }

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
      seen: quotation.seen,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
      productName: quotation.productId?.name,
       productImages: quotation.productId?.images?.slice(0, 3)  ,
      
     
       buyerName: quotation.buyer?.fullName,
       buyerProfilePic: quotation.buyer?.profilePic ,
    buyerAvatar:quotation.buyer?.avatar
      
    }

    res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
  } catch (err) {
    handleError(res, err);
  }
};
