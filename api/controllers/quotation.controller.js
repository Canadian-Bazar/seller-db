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
        let { page = 1, limit = 10, status } = validatedData;

        limit = Math.min(Number(limit), 50);
        page = Number(page);

        const filter = {};
        if (status) {
            filter.status = status;
        }

        const skip = (page - 1) * limit;

        const totalQuotations = await Quotation.countDocuments(filter);

        const quotations = await Quotation.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const respose = {
            docs:quotations ,
            hasPrev: page > 1,
            hasNext: skip + limit < totalQuotations,
            totalPages: Math.ceil(totalQuotations / limit),
        }

        res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, respose));
    } catch (err) {
        handleError(res, err);
    }
}





/**
 * const BuyerNotificationSchema = new mongoose.Schema({
     recipient:{
         type: mongoose.Types.ObjectId,
         ref: 'Buyer',
         required: true,
         index: true
     } ,
 
     sender: {
         model: {
             type: String,
             enum: ['Seller', 'Admin', 'System'],
             required: true
         },
         id: {
             type: mongoose.Schema.Types.ObjectId,
             refPath: 'sender.model',
             required: function() {
                 return this.sender.model !== 'System';
             }
         },
         name: {
             type: String,
             required: true
         },
         image: {
             type: String
         }
     },
     type: {
         type: String,
         enum: ['quote_accepted', 'quote_rejected', 'quote_updated', 'admin_message', 'system_alert', 'other'],
         required: true,
         index: true
     },
     
     message: {
         type: String,
         required: true
     },
     isRead: {
         type: Boolean,
         default: false,
         index: true
     },
     
     isArchived: {
         type: Boolean,
         default: false,
         index: true
     }
 } , { 
     timestamps:true ,
     collection:'BuyerNotifications'
 })
*/

export const mutateQuotationStatusController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const { quotationId, status } = validatedData;

        // Find quotation with valid status and belonging to the current seller
        const quotation = await Quotation.findOne({ 
            _id: quotationId, 
            status: { $in: ['in-progress', 'sent'] }, 
            seller: req.user._id 
        }).populate('seller');
        
        if (!quotation) {
            throw buildErrorObject(httpStatus.BAD_REQUEST, 'Quotation not found or already processed');
        }

        // Update quotation status
        quotation.status = status;
        await quotation.save();

        // Get buyer and seller IDs
        const buyer = quotation.buyer;
        const seller = quotation.seller._id;
        
        // Find or create chat between buyer and seller
        let existingChat = await Chat.findOne({ buyer, seller });
        if (!existingChat) {
            existingChat = await Chat.create({ 
                buyer, 
                seller,
                quotation: quotationId,
                status: 'active',
                unreadBy: 'buyer'
            });
        }

        let messageContent;
        let messageType;
        let notificationType;
        let notificationContent;

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
        } else if (status === 'rejected') {
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

        const newMessage = await Message.create({
            senderId: seller,
            senderModel: 'Seller',
            content: messageContent,
            chat: existingChat._id,
            quotationId: quotation._id,
            messageType: messageType,
            isRead: false
        });

        // Always create a quotation_created system message if it's the first message in the chat
        const messageCount = await Message.countDocuments({ chat: existingChat._id });
        if (messageCount <= 1) {
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

        // Update the chat's last message
        existingChat.lastMessage = newMessage._id;
        existingChat.unreadBy = 'buyer';
        await existingChat.save();

        // Send notification to buyer
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