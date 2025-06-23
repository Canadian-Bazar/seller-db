import express from 'express'

import authRoutes from '../routes/auth.routes.js'
import uploadRoutes from '../routes/upload.routes.js'
import quotationRoutes from './quotation.routes.js'
import productAttributesRoutes from './product-attributes.routes.js'
import productPricingRoutes from './product-pricing.routes.js'
import productDescriptionRoutes from './product-description.routes.js'
import productVariationsRoutes from './product-variations.routes.js'
import productImagesRoutes from './product-images.routes.js'
import productServicesRoutes from './product-services.routes.js'
import productInfoRoutes from './product-info.routes.js'
import profileRoutes from './profile.routes.js'
import productAnalyticsRoutes from './product-analytics.routes.js'
import productPerformanceRoutes from './product-performance.routes.js'
import categoryRoutes from './category.routes.js'
import businessTypesRoutes from './business-types.routes.js'

const v1Routes = express.Router()
const router = express.Router()

v1Routes.use('/auth', authRoutes)
v1Routes.use('/upload', uploadRoutes)
v1Routes.use('/quotation', quotationRoutes)
// v1Routes.use('/product-attributes', productAttributesRoutes)
v1Routes.use('/product-attributes' , productAttributesRoutes)
v1Routes.use('/product-pricing' , productPricingRoutes)
v1Routes.use('/product-description' , productDescriptionRoutes)
v1Routes.use('/product-variations' , productVariationsRoutes)
v1Routes.use('/product-images' , productImagesRoutes)
v1Routes.use('/product-services' , productServicesRoutes)
v1Routes.use('/product-info' , productInfoRoutes)
v1Routes.use('/profile', profileRoutes)
v1Routes.use('/product-analytics', productAnalyticsRoutes)
v1Routes.use('/product-performance', productPerformanceRoutes)
v1Routes.use('/category', categoryRoutes)
v1Routes.use('/business-types', businessTypesRoutes)

router.use('/api/v1', v1Routes)

export default router
