import buildErrorObject from '../utils/buildErrorObject.js';
import buildResponse from '../utils/buildResponse.js';
import Products from '../models/products.schema.js';
import { uploadFile } from '../helpers/aws-s3.js';
import httpStatus from 'http-status';
import handleError from '../utils/handleError.js';
import { matchedData } from 'express-validator';
import { markStepCompleteAsync } from '../helpers/markStepComplete.js';

export const syncImagesControllers = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const productId = validatedData.productId;
    const clientImages = validatedData.images || [];
    const clientVideos = validatedData.videos || [];
    const userId = req.user?._id;

    const existingProduct = await Products.findOne({
      _id: productId,
      seller: userId,
    });
    if (!existingProduct) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'No such product found');
    }

    const existingImages = existingProduct.images || [];
    const existingVideos = existingProduct.videos || [];
    const brochureFile = req?.files?.brochureFile || req?.files?.['brochureFile[]'];

    // Multer fields: support both name and name[]
    const imageFiles = [
      ...(req?.files?.imageFiles || []),
      ...(req?.files?.['imageFiles[]'] || []),
    ];

    const videoFiles = [
      ...(req?.files?.videoFiles || []),
      ...(req?.files?.['videoFiles[]'] || []),
    ];

    if (
      existingImages.length === 0 &&
      clientImages.length === 0 &&
      imageFiles.length === 0
    ) {
      throw buildErrorObject(
        httpStatus.BAD_REQUEST,
        'You need to upload at least one image',
      );
    }

    let brochureUrl = validatedData.brochure || null;

    const validExistingImages = existingImages.filter((img) =>
      clientImages.includes(img),
    );

    const validExistingVideos = existingVideos.filter((v) =>
      clientVideos.includes(v),
    );

    let updatedImages = [...validExistingImages];
    let updatedVideos = [...validExistingVideos];

    if (imageFiles && imageFiles.length > 0) {
      const newImageUrls = await uploadFile(imageFiles);
      updatedImages = [...updatedImages, ...newImageUrls];
    }

    if (videoFiles && videoFiles.length > 0) {
      const newVideoUrls = await uploadFile(videoFiles);
      updatedVideos = [...updatedVideos, ...newVideoUrls];
    }

    if (brochureFile && brochureFile.length > 0) {

      console.log('brochureFile', brochureFile);
      const urls = await uploadFile(brochureFile);
      brochureUrl = urls[0];
    }

    await Products.findOneAndUpdate(
      { _id: productId, seller: userId },
      { $set: { images: updatedImages, videos: updatedVideos , brochure: brochureUrl } },
    );

    await markStepCompleteAsync(productId, 'images');

    res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.OK, 'Media synced successfully'));
  } catch (err) {
    handleError(res, err);
  }
};

export const getProductImages = async (req, res) => {
  try {
    const validatedData = matchedData(req);

    const productId = validatedData.productId;

    const productMedia =
      await Products.findById(productId).select('images videos brochure');

    res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, {
        images: productMedia.images,
        videos: productMedia.videos,
        brochure: productMedia.brochure,
      }),
    );
  } catch (err) {
    handleError(res, err);
  }
};
