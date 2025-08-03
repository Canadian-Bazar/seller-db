import buildErrorObject from "../utils/buildErrorObject.js";
import handleError from "../utils/handleError.js";
import buildResponse from "../utils/buildResponse.js";
import { matchedData} from "express-validator";
import WebsiteQuotation from '../models/website-quotation.schema.js'
import httpStatus from 'http-status'
import Category from '../models/category.schema.js'
import jwt from 'jsonwebtoken'
import WebsiteTemplate from '../models/website-templates.schema.js'


export const createWebsiteTemplateController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { name, url, isActive } = validatedData;

    const existingTemplate = await WebsiteTemplate.findOne({ name });
    if (existingTemplate) {
      throw buildErrorObject(httpStatus.CONFLICT, 'Website template with this name already exists');
    }

    const websiteTemplateData = {
      name,
      url,
      isActive: isActive !== undefined ? isActive : true
    };

    const websiteTemplate = new WebsiteTemplate(websiteTemplateData);
    await websiteTemplate.save();

    return res.status(httpStatus.CREATED).json(buildResponse(httpStatus.CREATED,
      'Website template created successfully', websiteTemplate
    ));

  } catch (err) {
    handleError(res, err);
  }
};

export const updateWebsiteTemplateController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { name, url, isActive } = validatedData;
    const { id } = req.params;

    const websiteTemplate = await WebsiteTemplate.findById(id);
    if (!websiteTemplate) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Website template not found');
    }

    if (name && name !== websiteTemplate.name) {
      const existingTemplate = await WebsiteTemplate.findOne({ name, _id: { $ne: id } });
      if (existingTemplate) {
        throw buildErrorObject(httpStatus.CONFLICT, 'Website template with this name already exists');
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedTemplate = await WebsiteTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
      'Website template updated successfully', updatedTemplate
    ));

  } catch (err) {
    handleError(res, err);
  }
};

export const getWebsiteTemplateController = async (req, res) => {
  try {
    const { id } = req.params;

    const websiteTemplate = await WebsiteTemplate.findById(id);
    if (!websiteTemplate) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Website template not found');
    }

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
       websiteTemplate
    ));

  } catch (err) {
    handleError(res, err);
  }
};

export const getAllWebsiteTemplatesController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { isActive, page = 1, limit = 10 } = validatedData;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const totalDocs = await WebsiteTemplate.countDocuments(filter);
    const totalPages = Math.ceil(totalDocs / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    const docs = await WebsiteTemplate.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const response = {
      docs,
      totalDocs,
      totalPages,
      page: pageNumber,
      limit: limitNumber,
      hasNextPage,
      hasPrevPage
    };

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
       response
    ));

  } catch (err) {
    handleError(res, err);
  }
};

export const deleteWebsiteTemplateController = async (req, res) => {
  try {
    const { id } = req.params;

    const websiteTemplate = await WebsiteTemplate.findById(id);
    if (!websiteTemplate) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'Website template not found');
    }

    await WebsiteTemplate.findByIdAndDelete(id);

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK,
      'Website template deleted successfully', null
    ));

  } catch (err) {
    handleError(res, err);
  }
};


