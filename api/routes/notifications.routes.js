import express from 'express'
import trimRequest from 'trim-request'
import { requireAuth } from '../middlewares/auth.middleware.js'
import {
  listNotifications,
  getCounts,
  markAsRead,
  markAllAsRead,
  removeNotification,
  markTypeAsRead,
} from '../controllers/notifications.controller.js'

const router = express.Router()

router.use(trimRequest.all)
router.use(requireAuth)

router.get('/', listNotifications)
router.get('/counts', getCounts)
router.patch('/:id/read', markAsRead)
router.post('/mark-all-as-read', markAllAsRead)
router.post('/mark-type-as-read', markTypeAsRead)
router.delete('/:id', removeNotification)

export default router


