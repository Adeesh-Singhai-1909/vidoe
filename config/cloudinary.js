// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage configuration for videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi'], // add more formats if needed
    transformation: [{ quality: 'auto' }]
  }
});

// Storage configuration for thumbnails
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'thumbnails',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 280, height: 160, crop: 'fill' }]
  }
});

// Create multer uploaders
const videoUpload = multer({ storage: videoStorage });
const thumbnailUpload = multer({ storage: thumbnailStorage });

module.exports = {
  cloudinary,
  videoUpload,
  thumbnailUpload
};