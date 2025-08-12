// import Products from '../models/products.schema.js'




// export const markStepCompleteAsync = async (productId, completedStep , type='product') => {
//     try {


//         console.log(completedStep)
//         const product = await Products.findById(productId)
//             .select('stepStatus incompleteSteps completionPercentage isComplete')
//             .lean();

//         if (!product) {
//             throw new Error('Product not found');
//         }

//         const updatedStepStatus = {
//             ...product.stepStatus,
//             [completedStep]: true
//         };

//         const updatedIncompleteSteps = product.incompleteSteps.filter(step => step !== completedStep);

//         const totalSteps = 7;
//         const completedStepsCount = Object.values(updatedStepStatus).filter(Boolean).length;
//         const completionPercentage = Math.round((completedStepsCount / totalSteps) * 100);
//         const isComplete = completionPercentage === 100;

//         const updateData = {
//             [`stepStatus.${completedStep}`]: true,
//             incompleteSteps: updatedIncompleteSteps,
//             completionPercentage,
//             isComplete,
//             lastUpdatedStep: completedStep,
//             updatedAt: new Date()
//         };

//         if (isComplete && !product.isComplete) {
//             updateData.completedAt = new Date();
//         }

//         const data  = await Products.findByIdAndUpdate(productId, updateData);
//         console.log(data)

//     } catch (error) {
//         console.error('Error marking step complete:', error);
//         throw error;
//     }
// };


import Products from '../models/products.schema.js'
import Services from '../models/service.schema.js'

export const markStepCompleteAsync = async (entityId, completedStep, type = 'product') => {
    try {
        console.log(completedStep);
        
        let entity;
        let Model;
        let totalSteps;
        
        if (type === 'product') {
            Model = Products;
            totalSteps = 5; // product steps: productInfo, attributes, images, pricing, variations, services, description
        } else if (type === 'service') {
            Model = Services;
            totalSteps = 6; 
        } else {
            throw new Error('Invalid type. Must be "product" or "service"');
        }

        entity = await Model.findById(entityId)
            .select('stepStatus incompleteSteps completionPercentage isComplete')
            .lean();

        if (!entity) {
            throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} not found`);
        }

        const updatedStepStatus = {
            ...entity.stepStatus,
            [completedStep]: true
        };

        const updatedIncompleteSteps = entity.incompleteSteps.filter(step => step !== completedStep);

        const completedStepsCount = Object.values(updatedStepStatus).filter(Boolean).length;
        const completionPercentage = Math.round((completedStepsCount / totalSteps) * 100);
        const isComplete = completionPercentage === 100;

        const updateData = {
            [`stepStatus.${completedStep}`]: true,
            incompleteSteps: updatedIncompleteSteps,
            completionPercentage,
            isComplete,
            lastUpdatedStep: completedStep,
            updatedAt: new Date()
        };

        if (isComplete && !entity.isComplete) {
            updateData.completedAt = new Date();
        }

        const data = await Model.findByIdAndUpdate(entityId, updateData);
        console.log(data);

    } catch (error) {
        console.error('Error marking step complete:', error);
        throw error;
    }
};