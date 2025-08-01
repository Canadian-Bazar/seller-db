import buildErrorObject from "../utils/buildErrorObject.js";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData} from "express-validator";
import WebsiteQuotation from '../models/website-quotation.schema.js'
import httpStatus from 'http-status'
import Category from '../models/category.schema.js'




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



export const createWebsiteQuotationController = async (req, res) => {
    try{
       const {category, itemsSold, websiteUrl, domainName, referenceurl, refernceWeburls, additionalDetails} = validatedData;

const categoryExists = await Category.findById(category);
if (!categoryExists) {
    throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid Category')
}

const websiteTemplates = await WebsiteTemplate.find({ isActive: true });
const validTemplateUrls = websiteTemplates.map(template => template.url);

if (refernceWeburls && refernceWeburls.length > 0) {
  const invalidUrls = refernceWeburls.filter(url => !validTemplateUrls.includes(url));
  if (invalidUrls.length > 0) {
    throw buildErrorObject(httpStatus.BAD_REQUEST, 'Invalid website template URLs')
  }
}

const websiteQuotationData = {
  seller: req.user.id,
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

if (refernceWeburls && refernceWeburls.length > 0) {
  websiteQuotationData.refernceWeburls = refernceWeburls;
}

if (additionalDetails) {
  websiteQuotationData.additionalDetails = additionalDetails;
}

const websiteQuotation = new WebsiteQuotation(websiteQuotationData);
await websiteQuotation.save();
        



        

    }catch(err){
        handleError(res , err)

    }
}




export const getExistingQuotationController = async()