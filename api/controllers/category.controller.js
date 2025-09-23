import { matchedData } from 'express-validator';
import Category from '../models/category.schema.js';
import  httpStatus  from 'http-status';
import buildResponse from '../utils/buildResponse.js';
import buildErrorObject from '../utils/buildErrorObject.js';
import handleError from '../utils/handleError.js';
import mongoose from 'mongoose';




export const getAllCategories = async (req, res) => {
  try {

    const validatedData = matchedData(req);

    const page = Math.max(parseInt(validatedData.page) || 1, 1)
    const limit = Math.max(parseInt(validatedData.limit) || 10, 1)



    const skip = (page - 1) * limit;

    const filter = { isActive: true, parentCategory: { $exists: false } };

    if (validatedData.search) {
      filter.name = { $regex: validatedData.search, $options: 'i' };
    }

    

    const [totalDocs, categories] = await Promise.all([
      Category.countDocuments(filter),
      Category.find(filter)
      .sort({ name: 1 })
      .limit(limit)
      .skip(skip)
    ]);
    const totalPages = Math.ceil(totalDocs / limit);

    const response = {
      docs: categories,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      totalPages,
      currentPage: page,
      totalDocs
    }



    res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
  } catch (error) {
    handleError(res , error)
  }
}



export const getSubCategories = async (req, res) => {
  try {
    const validatedData = matchedData(req);

    const page = Math.max(parseInt(validatedData.page) || 1, 1);
    const limit = Math.max(parseInt(validatedData.limit) || 10, 1);
    const skip = (page - 1) * limit;
    const parentCategoryId = validatedData.parentCategoryId;

    let filter = {
      isActive: true
    };

    if (parentCategoryId) {
      filter.parentCategory = { $exists: true };
      filter.ancestors = parentCategoryId;
    }

    const [totalDocs, categories] = await Promise.all([
      Category.countDocuments(filter),
      Category.find(filter).sort({ name: 1 }).limit(limit).skip(skip)
    ]);

    const totalPages = Math.ceil(totalDocs / limit);

    const response = {
      docs: categories,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      totalPages,
      currentPage: page,
      totalDocs
    };

    res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
  } catch (err) {
    handleError(res, err);
  }
};

export const createSubCategory = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const { name, parentCategoryId, description, image } = validatedData;

    // Check if parent category exists and is active
    const parentCategory = await Category.findById(parentCategoryId);
    if (!parentCategory) {
      return res.status(httpStatus.NOT_FOUND).json(
        buildErrorObject(httpStatus.NOT_FOUND, 'Parent category not found')
      );
    }

    if (!parentCategory.isActive) {
      return res.status(httpStatus.BAD_REQUEST).json(
        buildErrorObject(httpStatus.BAD_REQUEST, 'Parent category is not active')
      );
    }

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim('-'); // Remove leading/trailing hyphens

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(httpStatus.CONFLICT).json(
        buildErrorObject(httpStatus.CONFLICT, 'A subcategory with this name already exists')
      );
    }

    // Build ancestors array by getting all parent categories
    const ancestors = [...parentCategory.ancestors, parentCategoryId];

    // Create the subcategory
    const subCategory = new Category({
      name,
      slug,
      description,
      image,
      parentCategory: parentCategoryId,
      ancestors,
      isActive: true
    });

    const savedSubCategory = await subCategory.save();

    // Populate parent category details
    await savedSubCategory.populate('parentCategory', 'name slug');

    res.status(httpStatus.CREATED).json(
      buildResponse(httpStatus.CREATED, savedSubCategory, 'Subcategory created successfully')
    );

  } catch (err) {
    handleError(res, err);
  }
};
