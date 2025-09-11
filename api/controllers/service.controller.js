import buildErrorObject from "../utils/buildErrorObject.js";
import buildResponse from "../utils/buildResponse.js";
import Services from '../models/service.schema.js'
import httpStatus from 'http-status';
import handleError from "../utils/handleError.js";
import { matchedData } from "express-validator";
import { markStepCompleteAsync } from "../helpers/markStepComplete.js";
import mongoose from 'mongoose'

export const createServiceController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;

        const { name, description , category } = validatedData;

        const newService = new Services({
            name: name,
            description: description,
            seller: userId,
            
            isComplete: false,
            completionPercentage: 0,
            incompleteSteps: ['serviceInfo', 'capabilities', 'media' ,'order'],
            stepStatus: {
                serviceInfo: false,
                capabilities: false,
                order: false,
                pricing: false,
                customization: false,
                media: false
            } ,

            category:category
        });

        const savedService = await newService.save();
        markStepCompleteAsync(savedService._id, 'serviceInfo' , 'service');

        res.status(httpStatus.CREATED).json(
            buildResponse(httpStatus.CREATED, savedService)
        );

    } catch (err) {
        handleError(res, err);
    }
};

export const updateServiceInfoController = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const userId = req.user._id;
        const { serviceId } = req.params;
        const { name, description , category} = validatedData;

        const updateData = {};
        
        if (name !== undefined) {
            updateData.name = name;
        }
        
        if (description !== undefined) {
            updateData.description = description;
        }

        if(category !== undefined) {
            updateData.category = category ;
        }

        const updatedService = await Services.findByIdAndUpdate(
            serviceId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedService) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Service info updated successfully')
        );

        markStepCompleteAsync(serviceId, 'serviceInfo' , 'service');

    } catch (err) {
        handleError(res, err);
    }
};

export const getServiceInfoController = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Services.findById(serviceId)
            .select('name description completionPercentage incompleteSteps stepStatus')
            .populate('category' , 'name slug _id');


        if (!service) {
            throw buildErrorObject(httpStatus.NOT_FOUND, 'Service not found');
        }

        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, service)
        );

    } catch (err) {
        handleError(res, err);
    }
};


export const getServicesController = async (req, res) => {
  try {
    const validatedData = matchedData(req);
    const pipeline = [];

    const page = parseInt(validatedData.page || 1, 10);
    const limit = Math.min(parseInt(validatedData.limit || 10, 10), 50);
    const offset = (page - 1) * limit;

    const sellerId = req.user._id;
    const matchStage = {
      seller: new mongoose.Types.ObjectId(sellerId)
    };

    // Search filter
    if (validatedData.search) {
      matchStage.name = {
        $regex: validatedData.search,
        $options: 'i'
      };
    }

    // Incomplete status filter
   if (validatedData.inComplete) {
  matchStage.completionPercentage = { $ne: 100 };
}



    if (validatedData.isComplete) {
      matchStage.completionPercentage = 100;
    }

    pipeline.push({ $match: matchStage });

    // Lookup ServiceMedia to get images
    pipeline.push({
      $lookup: {
        from: 'ServiceMedia',
        localField: '_id',
        foreignField: 'serviceId',
        as: 'mediaData'
      }
    });

    // Unwind media data (optional - keeps services without media)
    pipeline.push({
      $unwind: {
        path: '$mediaData',
        preserveNullAndEmptyArrays: true
      }
    });

    // Sorting logic
    let sortStage = { createdAt: -1 };
    if (validatedData.createdAt) {
      sortStage = { createdAt: parseInt(validatedData.createdAt) };
    }

    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: offset });
    pipeline.push({ $limit: limit });

    // Final projection - full service schema + few images
    pipeline.push({
      $project: {
        // Full service schema fields
        name: 1,
        description: 1,
        avgRating: 1,
        ratingsCount: 1,
        isComplete: 1,
        completionPercentage: 1,
        incompleteSteps: 1,
        stepStatus: 1,
        createdAt: 1,
        updatedAt: 1,

        // Few images from ServiceMedia (first 3)
        images: {
          $slice: ['$mediaData.images', 3]
        },
        
        // Optional: warranty info if available
        warranty: '$mediaData.warranty'
      }
    });

    const services = await Services.aggregate(pipeline);

    // Get total count for pagination
    const countResult = await Services.aggregate([
      { $match: matchStage },
      { $count: 'count' }
    ]);
    const total = countResult[0]?.count || 0;

    const response = {
      docs: services,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasPrev: page > 1,
      hasNext: page * limit < total
    };

    return res.status(httpStatus.OK).json(buildResponse(httpStatus.OK, response));
  } catch (err) {
    handleError(res, err);
  }
};




export const deleteServiceController = async (req, res) => {
    try {

      const validatedData = matchedData(req);
      const userId = req.user._id;
      const { id } = validatedData;



      const service = await Services.find({ _id: id, seller: userId });
      if (!service || service.length === 0) {
        return res.status(httpStatus.NOT_FOUND).json(
            buildErrorObject(httpStatus.NOT_FOUND, 'Service not found')
        );
      }


      if(parseInt(service[0].completionPercentage) === 100) {
        return res.status(httpStatus.BAD_REQUEST).json(
            buildErrorObject(httpStatus.BAD_REQUEST, 'Cannot delete a completed service')
        );
      }


        const serviceId = service[0]._id;



        const deletedService = await Services.findByIdAndDelete(serviceId);
        if (!deletedService) {
            return res.status(httpStatus.NOT_FOUND).json(
                buildErrorObject(httpStatus.NOT_FOUND, 'Service not found')
            );
        }


        res.status(httpStatus.OK).json(
            buildResponse(httpStatus.OK, 'Service deleted successfully')
        );

    } catch (err) {
        handleError(res, err);
    }
}


export const archiveServiceController = async(req , res)=>{
  try{
    const validatedData = matchedData(req);
    const userId = req.user._id;
    const { serviceId } = validatedData;

    const service = await Services.find({ _id: serviceId, seller: userId });  

    if (!service || service.length === 0) {
      return res.status(httpStatus.NOT_FOUND).json(
          buildErrorObject(httpStatus.NOT_FOUND, 'Service not found')
      );
    } 

    if(parseInt(service[0].completionPercentage) !== 100) {
      return res.status(httpStatus.BAD_REQUEST).json(
          buildErrorObject(httpStatus.BAD_REQUEST, 'Only completed services can be archived')
      );
    } 
    if(service[0].isArchived) {
      return res.status(httpStatus.BAD_REQUEST).json(
          buildErrorObject(httpStatus.BAD_REQUEST, 'Service is already archived')
      );
    }

    service[0].isArchived = true;
    await service[0].save();  

    res.status(httpStatus.OK).json(
        buildResponse(httpStatus.OK, 'Service archived successfully')
    );  

  } catch(err) {
    handleError(res, err);
  }
}



