import express from 'express'

import authRoutes from '../routes/auth.routes.js'
import uploadRoutes from '../routes/upload.routes.js'
import quotationRoutes from './quotation.routes.js'

const v1Routes = express.Router()
const router = express.Router()

v1Routes.use('/auth', authRoutes)
v1Routes.use('/upload', uploadRoutes)
v1Routes.use('/quotation', quotationRoutes)

router.use('/api/v1', v1Routes)

export default router
