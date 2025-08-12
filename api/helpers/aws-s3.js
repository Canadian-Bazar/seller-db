import { GetObjectCommand , ListBucketsCommand, PutObjectCommand , S3Client } from "@aws-sdk/client-s3";
import fs from 'fs'
import handleError from "../utils/handleError.js";


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


export const verifyAWSConnection = async () => {
  console.log('Verifying AWS connection...');
  try{
    const command = new ListBucketsCommand({})
    const response = await s3.send(command)
    console.log('AWS Connection Verified. Buckets:', response.Buckets);

  }catch(err){
    console.error('Failed to connect to AWS:', err.message);
    process.exit(1);
  }
}


export const uploadFile = async (files) => {
  try {
    const bucketName = process.env.S3_BUCKET;
    
    console.log('Starting file upload process...');
    console.log('Raw files input:', files);
    console.log('Type of files:', typeof files);
    console.log('Is array?', Array.isArray(files));
    
    if (!bucketName) {
      console.error('S3_BUCKET_NAME is not set in environment variables');
      throw new Error('S3_BUCKET_NAME is not set');
    }
    
    // HANDLE DIFFERENT INPUT FORMATS
    let filesArray;
    
    if (!files) {
      throw new Error('No files provided');
    }
    
    // If files is already an array
    if (Array.isArray(files)) {
      filesArray = files;
    }
    // If files is a single file object
    else if (files.filename || files.originalname) {
      filesArray = [files];
    }
    // If files is an object with file properties (from multer)
    else if (typeof files === 'object') {
      // Handle multer fieldname format: { fieldname: [file1, file2] }
      const keys = Object.keys(files);
      if (keys.length > 0) {
        const firstKey = keys[0];
        if (Array.isArray(files[firstKey])) {
          filesArray = files[firstKey];
        } else {
          filesArray = [files[firstKey]];
        }
      } else {
        throw new Error('No files found in upload object');
      }
    }
    else {
      throw new Error('Invalid files format');
    }
    
    if (!filesArray || filesArray.length === 0) {
      throw new Error('No files to upload');
    }
    
    console.log('Processed files array:', filesArray.map(f => ({ 
      filename: f.filename, 
      mimetype: f.mimetype, 
      size: f.size,
      path: f.path
    })));
    
    const uploadPromises = filesArray.map(async (file) => {
      try {
        // Validate file object
        if (!file || !file.filename || !file.path) {
          throw new Error(`Invalid file object: ${JSON.stringify(file)}`);
        }
        
        // Validate file exists
        if (!fs.existsSync(file.path)) {
          throw new Error(`File not found: ${file.path}`);
        }
        
        const fileStream = fs.createReadStream(file.path);
        const fileStats = fs.statSync(file.path);
        
        // Get file extension for content type validation
        const fileExtension = file.filename.toLowerCase().split('.').pop();
        const isVideo = isVideoFile(fileExtension);
        
        const uploadParams = {
          Bucket: bucketName,
          Key: file.filename,
          Body: fileStream,
          ContentType: file.mimetype,
          ContentDisposition: 'inline', // Critical for inline display
          
          // Cache control based on file type
          CacheControl: getCacheControlForUpload(fileExtension),
        };
        
        console.log(`Uploading ${file.filename} (${formatFileSize(fileStats.size)})...`);
        
        // Upload to S3
        const uploadResult = await s3.send(new PutObjectCommand(uploadParams));
        
        console.log(`✅ Successfully uploaded: ${file.filename}`);
        
        // Clean up temporary file
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Cleaned up temp file: ${file.path}`);
        } catch (err) {
          console.error(`❌ Error deleting temp file ${file.path}:`, err.message);
        }
        
        // Return simple filename (your existing format)
        return file.filename;
        
      } catch (uploadError) {
        console.error(`❌ Failed to upload ${file?.filename || 'unknown'}:`, uploadError.message);
        
        // Clean up temp file even if upload failed
        try {
          if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error(`Error cleaning up failed upload temp file:`, cleanupError.message);
        }
        
        throw new Error(`Failed to upload ${file?.filename || 'unknown'}: ${uploadError.message}`);
      }
    });
    
    const uploadedFiles = await Promise.all(uploadPromises);
    
    console.log(`🎉 Successfully uploaded ${uploadedFiles.length} file(s)`);
    
    return uploadedFiles;
    
  } catch (err) {
    console.error('❌ Error in upload process:', err.message);
    console.error('Error stack:', err.stack);
    throw new Error(`Upload failed: ${err.message}`);
  }
};

// Helper functions (keep these)
const isVideoFile = (fileExtension) => {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'quicktime'];
  return videoExtensions.includes(fileExtension.toLowerCase());
};

const isImageFile = (fileExtension) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  return imageExtensions.includes(fileExtension.toLowerCase());
};

const getCacheControlForUpload = (fileExtension) => {
  if (isImageFile(fileExtension)) {
    return 'public, max-age=2592000, immutable'; // 30 days for images
  } else if (isVideoFile(fileExtension)) {
    return 'public, max-age=86400'; // 1 day for videos
  } else {
    return 'public, max-age=604800'; // 7 days for documents
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};