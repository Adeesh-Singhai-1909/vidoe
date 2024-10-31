// models/User.js
const mongoose = require('mongoose');

const userVideoSchema = new mongoose.Schema({
  filePath: {
    type: String,
    required: true
  },
  cloudinaryPublicId: String, // Added for Cloudinary
  createdAt: {
    type: Number,
    default: () => new Date().getTime()
  },
  views: {
    type: Number,
    default: 0
  },
  watch: Number,
  minutes: Number,
  seconds: Number,
  hours: Number,
  title: String,
  description: String,
  tags: String,
  category: String,
  thumbnail: String,
  thumbnailPublicId: String // Added for Cloudinary
});

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  image: String,
  subscribers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  videos: [userVideoSchema]
});

// models/Video.js
const commentSchema = new mongoose.Schema({
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    first_name: String,
    last_name: String,
    image: String
  },
  comment: {
    type: String,
    required: true
  },
  createdAt: {
    type: Number,
    default: () => new Date().getTime()
  }
});

const videoSchema = new mongoose.Schema({
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    first_name: String,
    last_name: String,
    image: String,
    subscribers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  filePath: {
    type: String,
    required: true
  },
  cloudinaryPublicId: String, // Added for Cloudinary
  createdAt: {
    type: Number,
    default: () => new Date().getTime()
  },
  views: {
    type: Number,
    default: 0
  },
  watch: Number,
  minutes: Number,
  seconds: Number,
  hours: Number,
  title: String,
  description: String,
  tags: String,
  category: String,
  thumbnail: String,
  thumbnailPublicId: String, // Added for Cloudinary
  comments: [commentSchema]
});

const User = mongoose.model('User', userSchema);
const Video = mongoose.model('Video', videoSchema);

module.exports = { User, Video };