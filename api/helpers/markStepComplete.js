import Products from '../models/products.schema.js'




export const markStepCompleteAsync = async (productId, completedStep) => {
    try {


        console.log(completedStep)
        const product = await Products.findById(productId)
            .select('stepStatus incompleteSteps completionPercentage isComplete')
            .lean();

        if (!product) {
            throw new Error('Product not found');
        }

        const updatedStepStatus = {
            ...product.stepStatus,
            [completedStep]: true
        };

        const updatedIncompleteSteps = product.incompleteSteps.filter(step => step !== completedStep);

        const totalSteps = 7;
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

        if (isComplete && !product.isComplete) {
            updateData.completedAt = new Date();
        }

        const data  = await Products.findByIdAndUpdate(productId, updateData);
        console.log(data)

    } catch (error) {
        console.error('Error marking step complete:', error);
        throw error;
    }
};