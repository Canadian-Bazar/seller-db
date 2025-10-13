import buildErrorObject from "../utils/buildErrorObject.js";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData} from "express-validator";
import WebsiteQuotation from '../models/website-quotation.schema.js'
import httpStatus from 'http-status'
import Category from '../models/category.schema.js'
import jwt from 'jsonwebtoken'
import WebsiteTemplate from '../models/website-templates.schema.js'
import WebsiteDocumentation from '../models/website-documentation.schema.js'
import WebsiteProject from '../models/website-project.schema.js'
import WebsiteProjectChat from '../models/website-project-chat.schema.js'
import mongoose from 'mongoose'







/**const WebsiteQuotationSchema = new mongoose.Schema({


    seller:{
        type:mongoose.Types.ObjectId ,
        ref:'Sellers' ,
        required:true

    } ,
    category:{
        type:mongoose.Types.ObjectId ,
        ref:'Category' ,
        required:true
    
    } ,

    itemsSold:{
        type:String , 
        required:true ,
        enum :['service' , 'product' , 'both'] ,
        required:true
    
    } ,

    websiteUrl:{
        type:String ,
        } ,


    domainName:{
        type:String ,
        required:true
    } ,

    referenceurl:{
        type:String
    } ,

    refernceWeburls:[
        {
            type:mongoose.Types.ObjectId ,
            ref:'WebsiteTemplate'

        }
    
    ] ,

    additionalDetails:{
        type:String ,
    } 






} ,*/



export const generateWebsiteDocumentationToken = (id) =>{
  return jwt.sign({documentationId:id , })
}



export const createWebsiteQuotationController = async (req, res) => {
  try {

    console.log("user" , req.user)
    const validatedData = matchedData(req);
    const userId = req.user._id
    const { category, itemsSold, websiteUrl, domainName, referenceurl, referenceWebTemplates, additionalDetails } = validatedData;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid Category');
    }

    if (referenceWebTemplates && referenceWebTemplates.length > 0) {
      const templateIds = referenceWebTemplates.map(id => id.toString());
      const existingTemplates = await WebsiteTemplate.find({ 
        _id: { $in: templateIds }, 
        isActive: true 
      });
      
      if (existingTemplates.length !== templateIds.length) {
        const foundIds = existingTemplates.map(template => template._id.toString());
        const invalidIds = templateIds.filter(id => !foundIds.includes(id));
        throw buildErrorObject(httpStatus.BAD_REQUEST, `Invalid or inactive website template IDs: ${invalidIds.join(', ')}`);
      }
    }

    const websiteQuotationData = {
      seller: userId,
      category,
      itemsSold,
      domainName
    };

    if (websiteUrl) {
      websiteQuotationData.websiteUrl = websiteUrl;
    }

    if (referenceurl) {
      websiteQuotationData.referenceurl = referenceurl;
    }

    if (referenceWebTemplates && referenceWebTemplates.length > 0) {
      websiteQuotationData.referenceWebTemplates = referenceWebTemplates;
    }

    if (additionalDetails) {
      websiteQuotationData.additionalDetails = additionalDetails;
    }




    const websiteQuotation = new WebsiteQuotation(websiteQuotationData);
    await websiteQuotation.save();

    // ➕ CREATE WebsiteProject immediately (without documentation)
    const websiteProject = new WebsiteProject({
      seller: userId,
      websiteQuotation: websiteQuotation._id,
      projectStatus: 'quotation_submitted',
      paymentStatus: 'pending'
    });
    await websiteProject.save();

    // ➕ CREATE WebsiteProjectChat immediately using schema
    const websiteProjectChat = new WebsiteProjectChat({
      seller: userId,
      websiteProjectId: websiteProject._id,
      status: 'active'
    });
    await websiteProjectChat.save();

    return res.status(httpStatus.CREATED).json(buildResponse(httpStatus.CREATED,
      'Website quotation created successfully', {
        quotation: websiteQuotation,
        project: websiteProject
      }
    ));

  } catch (err) {
    handleError(res, err);
  }
};

export const getAllWebsiteQuotationsController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { page = 1, limit = 10, status } = validatedData;

    const filter = {  };
    if (status) {
      filter.status = status;
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const totalDocs = await WebsiteQuotation.countDocuments(filter);
    const totalPages = Math.ceil(totalDocs / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    const docs = await WebsiteQuotation.find(filter)
      .populate('category', 'name')
      .select('category itemsSold domainName status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const processedDocs = docs.map(doc => ({
      ...doc.toObject(),
      categoryName: doc.category?.name || 'Unknown',
      itemType: doc.itemsSold === 'both' ? 'Products and Services' 
               : doc.itemsSold === 'service' ? 'Services' 
               : 'Products'
    }));

    const response = {
      docs: processedDocs,
      totalDocs,
      totalPages,
      page: pageNumber,
      limit: limitNumber,
      hasNextPage,
      hasPrevPage
    };

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));

  } catch (err) {
    handleError(res, err);
  }
};
export const getWebsiteQuotationByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const websiteQuotation = await WebsiteQuotation.findOne({ 
      _id: id, 
      seller: req.user.id 
    })
    .populate('category', 'name description')
    .populate('referenceWebTemplates', 'name url');

    if (!websiteQuotation) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Website quotation not found');
    }

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
   websiteQuotation
    ));

  } catch (err) {
    handleError(res, err);
  }
};







