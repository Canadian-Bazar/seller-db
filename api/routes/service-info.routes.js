import express from 'express'

const router = express.Router()
import { requireAuth } from '../middlewares/auth.middleware.js'

import * as serviceInfoValidators from '../validators/service.validator.js'
import * as serviceInfoControllers from '../controllers/service.controller.js'

router.use(requireAuth)


router.get(
    '/',
    serviceInfoValidators.validateGetServices,
    serviceInfoControllers.getServicesController
)




router.get(
    '/:serviceId',
    serviceInfoValidators.validateGetServiceInfo,
    serviceInfoControllers.getServiceInfoController
)

router.put(
    '/:serviceId',
    serviceInfoValidators.validateUpdateService,
    serviceInfoControllers.updateServiceInfoController
)

router.post(
    '/',
    serviceInfoValidators.validateCreateService,
    serviceInfoControllers.createServiceController
)


router.delete(
    '/:id',
    serviceInfoValidators.validateDeleteService,
    serviceInfoControllers.deleteServiceController
)



router.patch(
    '/:serviceId',
    serviceInfoValidators.validateArchiveService,
    serviceInfoControllers.archiveServiceController
)

router.patch(
    '/:serviceId/status',
    serviceInfoValidators.validateToggleServiceStatus,
    serviceInfoControllers.toggleServiceStatusController
)




export default router