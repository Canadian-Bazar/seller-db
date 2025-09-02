import express from 'express'
import authRoutes from '../routes/auth.routes.js'
import uploadRoutes from '../routes/upload.routes.js'
import quotationRoutes from './quotation.routes.js'
import serviceQuotationRoutes from './service-quotation.routes.js'
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
import productRoutes from './product.routes.js'
import invoiceRoutes from './invoice.routes.js'
import orderRoutes from './orders.routes.js'
import contactChangeRoutes from './contact-change.routes.js'
import subscriptionRoutes from './subscription.routes.js'
import serviceInfoRoutes from './service-info.routes.js'
import serviceCapabilitiesRoutes from './service-capabilities.routes.js'
import serviceCustomizationRoutes from './service-customization.routes.js'
import serviceMediaRoutes from './service-media.routes.js'
import serviceOrderRoutes from './service-order.routes.js'
import servicePricingRoutes from './service-pricing.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import careerRoutes from './career.routes.js'
import websiteQuotationRouter from './website-quotation.routes.js'
import websiteTemplatesRoutes from './wesbite-template.routes.js'
import websiteDocumentationRoutes from './website-documentation.routes.js'
import websiteProjectRoutes from './website-project.routes.js'
import reviewRoutes from './review.routes.js'
import claimStoreRoutes from './claim-stores.routes.js'
import certificationRoutes from './certifications.routes.js'
import serviceInvoiceRoutes from './service-invoice.routes.js'




const v1Routes = express.Router()
const router = express.Router()

v1Routes.use('/auth', authRoutes)
v1Routes.use('/upload', uploadRoutes)
v1Routes.use('/quotation', quotationRoutes)
v1Routes.use('/service-quotation', serviceQuotationRoutes)
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
v1Routes.use('/products' , productRoutes)
v1Routes.use('/invoice' , invoiceRoutes)
v1Routes.use('/orders' , orderRoutes)
v1Routes.use('/contact-change' ,contactChangeRoutes)
v1Routes.use('/subscription' , subscriptionRoutes)
v1Routes.use('/service-info', serviceInfoRoutes)
v1Routes.use('/service-capabilities', serviceCapabilitiesRoutes)
v1Routes.use('/service-customization', serviceCustomizationRoutes)
v1Routes.use('/service-media', serviceMediaRoutes)
v1Routes.use('/service-orders', serviceOrderRoutes)
v1Routes.use('/service-pricing', servicePricingRoutes)
v1Routes.use('/dashboard', dashboardRoutes)
v1Routes.use('/career', careerRoutes)
v1Routes.use('/website-quotation'  , websiteQuotationRouter)
v1Routes.use('/website-templates' , websiteTemplatesRoutes)
v1Routes.use('/website-documentation' , websiteDocumentationRoutes)
v1Routes.use('/website-project' , websiteProjectRoutes)
v1Routes.use('/reviews' , reviewRoutes)
v1Routes.use('/claim-stores', claimStoreRoutes)
v1Routes.use('/certifications', certificationRoutes)
v1Routes.use('/service-invoice', serviceInvoiceRoutes)







router.use('/api/v1', v1Routes)

export default router
