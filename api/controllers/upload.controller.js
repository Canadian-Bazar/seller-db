
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { ListBucketsCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dotenv from 'dotenv'
import { matchedData } from 'express-validator'
import fs from 'fs'
import httpStatus from 'http-status'
import mongoose from 'mongoose'

import buildErrorObject from '../utils/buildErrorObject.js'
import getSignedURL from '../utils/getSignedUrl.js'
import handleError from '../utils/handleError.js'
import { uploadFile } from '../helpers/aws-s3.js'
  
dotenv.config()
// Configure S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
  
export const verifyAWSConnection = async () => {
  console.log('data')
  console.log('Verifying AWS connection...')
  try {
    const command = new ListBucketsCommand({})
    const response = await s3.send(command)
    console.log('AWS Connection Verified. Buckets:', response.Buckets)
  } catch (error) {
    console.error('Failed to connect to AWS:', error.message)
    process.exit(1)
  }
}
  
// Upload Controller
export const uploadController = async (req, res) => {
  try {
    const files = req.files
  
    const bucketName = process.env.S3_BUCKET
  
    if (!bucketName) {
      console.error('S3_BUCKET_NAME is not set in environment variables')
      throw buildErrorObject(httpStatus.INTERNAL_SERVER_ERROR, 'S3_BUCKET_NAME is not set')
    }
    if (!files || files.length === 0) {
      throw buildErrorObject(httpStatus.BAD_REQUEST, 'No files uploaded')
    }



      const newImageUrls = await uploadFile(req.files);
    
  
  
    res.status(httpStatus.OK).json({
      message: 'Files uploaded successfully',
      files: newImageUrls,
    })
  } catch (error) {
    handleError(res ,error)
  }
}
  