import express from 'express'
import * as profileController from '../controllers/profile.controller.js'
import * as profileValidator from '../validators/profile.validator.js'
import {requireAuth} from '../middlewares/auth.middleware.js'
import  trimRequest from 'trim-request';
import multer from 'multer';

const upload = multer({
 dest: 'uploads',
})

const router = express.Router()

router.use(requireAuth)
router.use(trimRequest.all)


router.get(
  '/',
  profileValidator.getProfileValidator ,
  profileController.getProfile
)
router.put(
  '/',
  upload.array('files', 1),
  profileValidator.updateProfileValidator,
  profileController.updateProfile
)

export default router