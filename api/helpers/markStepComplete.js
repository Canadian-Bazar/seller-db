import Products from '../models/products.schema.js'
import Services from '../models/service.schema.js'
import { productStepConfig, serviceStepConfig } from './stepConfig.js'

export const markStepCompleteAsync = async (entityId, completedStep, type = 'product') => {
  try {
    let Model;
    let stepConfig;

    if (type === 'product') {
      Model = Products;
      stepConfig = productStepConfig.product;
    } else if (type === 'service') {
      Model = Services;
      stepConfig = serviceStepConfig.service;
    } else {
      throw new Error('Invalid type. Must be "product" or "service"');
    }

    const entity = await Model.findById(entityId)
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

    const requiredSteps = Object.keys(stepConfig).filter(
      step => !stepConfig[step].optional
    );


    console.log('Updated Step Status:', updatedStepStatus);
    console.log('Updated Incomplete Steps:', updatedIncompleteSteps);
    console.log('Required Steps:', requiredSteps);


    const completedRequiredSteps = requiredSteps.filter(
      step => updatedStepStatus[step] === true
    );

    console.log('Completed Required Steps:', completedRequiredSteps);

    const completionPercentage = Math.round(
      (completedRequiredSteps.length / requiredSteps.length) * 100
    );

    console.log('Completion Percentage:', completionPercentage);

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

    await Model.findByIdAndUpdate(entityId, updateData, { new: true });

  } catch (error) {
    console.error('Error marking step complete:', error);
    throw error;
  }
};
