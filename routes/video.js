const express = require('express');
const router = express.Router();
const formidable = require("formidable");
const fileSystem = require("fs");
const { User, Video } = require('../models/User');
const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.json({
            status: "error",
            message: "Please login to perform this action."
        });
    }
};

// Upload page route
router.get("/upload", isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        res.render("upload", {
            isLogin: true,
            user: user,
            url: req.url
        });
    } catch (error) {
        console.error("Error in upload route:", error);
        res.status(500).send("Error loading upload page");
    }
});

// Get user route
router.get("/get_user", isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        if (!user) {
            return res.json({
                status: "error",
                message: "User not found"
            });
        }
        const userObj = user.toObject();
        delete userObj.password;
        res.json({
            status: "success",
            message: "Record has been fetched",
            user: userObj
        });
    } catch (error) {
        console.error("Error in get_user:", error);
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// Upload video route
router.post("/upload-video", isLoggedIn, async (req, res) => {
    const form = new formidable.IncomingForm();
    form.maxFileSize = 1000 * 1024 * 1204;
    
    form.parse(req, async function (error, fields, files) {
        try {
            const { title, description, tags, category } = fields;
            
            // Upload video to Cloudinary
            const videoResult = await cloudinary.uploader.upload(files.video.path, {
                resource_type: "video",
                folder: "videos",
                use_filename: true,
                unique_filename: true
            });

            // Upload thumbnail to Cloudinary
            const thumbnailResult = await cloudinary.uploader.upload(files.thumbnail.path, {
                folder: "thumbnails",
                use_filename: true,
                unique_filename: true
            });

            const duration = videoResult.duration;
            const hours = Math.floor(duration / 60 / 60);
            const minutes = Math.floor(duration / 60) - hours * 60;
            const seconds = Math.floor(duration % 60);

            const user = await User.findById(req.session.user_id);
            const currentTime = new Date().getTime();

            // Create new video document
            const video = new Video({
                user: {
                    _id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    image: user.image,
                    subscribers: user.subscribers
                },
                filePath: videoResult.secure_url,
                cloudinaryPublicId: videoResult.public_id,
                createdAt: currentTime,
                views: 0,
                watch: currentTime,
                minutes, seconds, hours,
                title, description, tags,
                category,
                thumbnail: thumbnailResult.secure_url,
                thumbnailPublicId: thumbnailResult.public_id
            });

            // Save video
            const savedVideo = await video.save();

            // Add video to user's videos array
            user.videos.push({
                ...savedVideo.toObject(),
                _id: savedVideo._id
            });
            await user.save();

            // Clean up temp files
            fileSystem.unlink(files.video.path, () => {});
            fileSystem.unlink(files.thumbnail.path, () => {});
            
            res.redirect("/edit?v=" + currentTime);
        } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({
                status: "error",
                message: "Error uploading files"
            });
        }
    });
});

// Save video route
router.post("/save-video", isLoggedIn, async (req, res) => {
    try {
        const { title, description, tags, videoId, category, minutes, seconds } = req.body;

        const user = await User.findOne({
            _id: req.session.user_id,
            "videos._id": videoId
        });

        if (!user) {
            return res.send("Sorry you do not own this video");
        }

        // Update video document
        await Video.findByIdAndUpdate(videoId, {
            title, description, tags, category, minutes, seconds
        });

        // Update video in user's videos array
        await User.findOneAndUpdate(
            {
                _id: req.session.user_id,
                "videos._id": videoId
            },
            {
                $set: {
                    "videos.$.title": title,
                    "videos.$.description": description,
                    "videos.$.tags": tags,
                    "videos.$.category": category,
                    "videos.$.minutes": minutes,
                    "videos.$.seconds": seconds
                }
            }
        );

        res.json({
            status: "success",
            message: "Video has been published"
        });
    } catch (error) {
        console.error("Save error:", error);
        res.status(500).json({
            status: "error",
            message: "Error saving video"
        });
    }
});

// Edit video route
router.post("/edit", isLoggedIn, async (req, res) => {
    const form = new formidable.IncomingForm();
    
    form.parse(req, async function (error, fields, files) {
        try {
            const { title, description, tags, videoId } = fields;
            let thumbnailUrl = fields.thumbnailPath;
            let thumbnailPublicId = fields.thumbnailPublicId;

            if (files.thumbnail && files.thumbnail.size > 0) {
                if (fields.thumbnailPublicId) {
                    await cloudinary.uploader.destroy(fields.thumbnailPublicId);
                }

                const thumbnailResult = await cloudinary.uploader.upload(files.thumbnail.path, {
                    folder: "thumbnails",
                    use_filename: true,
                    unique_filename: true
                });

                thumbnailUrl = thumbnailResult.secure_url;
                thumbnailPublicId = thumbnailResult.public_id;
                fileSystem.unlink(files.thumbnail.path, () => {});
            }

            const user = await User.findOne({
                _id: req.session.user_id,
                "videos._id": videoId
            });

            if (!user) {
                return res.send("Sorry you do not own this video");
            }

            const updateData = {
                title, description, tags,
                category: fields.category,
                thumbnail: thumbnailUrl,
                thumbnailPublicId
            };

            const video = await Video.findByIdAndUpdate(
                videoId,
                { $set: updateData },
                { new: true }
            );

            await User.findOneAndUpdate(
                {
                    _id: req.session.user_id,
                    "videos._id": videoId
                },
                {
                    $set: {
                        "videos.$.title": title,
                        "videos.$.description": description,
                        "videos.$.tags": tags,
                        "videos.$.category": fields.category,
                        "videos.$.thumbnail": thumbnailUrl,
                        "videos.$.thumbnailPublicId": thumbnailPublicId
                    }
                }
            );

            res.render("edit-video", {
                isLogin: true,
                video,
                user,
                url: req.url,
                message: "Video has been saved"
            });
        } catch (error) {
            console.error("Edit error:", error);
            res.status(500).json({
                status: "error",
                message: "Error updating video"
            });
        }
    });
});

router.delete("/delete-video/:videoId", isLoggedIn, async (req, res) => {
    try {
        // Find video by watch timestamp
        const video = await Video.findOne({ watch: parseInt(req.params.videoId) });
        
        if (!video) {
            return res.status(404).json({
                status: "error",
                message: "Video not found"
            });
        }

        // Verify ownership
        if (video.user._id.toString() !== req.session.user_id) {
            return res.status(403).json({
                status: "error",
                message: "You don't have permission to delete this video"
            });
        }

        // Delete video from Cloudinary
        if (video.cloudinaryPublicId) {
            await cloudinary.uploader.destroy(video.cloudinaryPublicId, { 
                resource_type: "video" 
            });
        }

        // Delete thumbnail from Cloudinary
        if (video.thumbnailPublicId) {
            await cloudinary.uploader.destroy(video.thumbnailPublicId);
        }

        // Remove video from User's videos array
        await User.findOneAndUpdate(
            { _id: req.session.user_id },
            { $pull: { videos: { watch: parseInt(req.params.videoId) } } }
        );

        // Delete video document
        await Video.findOneAndDelete({ watch: parseInt(req.params.videoId) });

        res.json({
            status: "success",
            message: "Video has been deleted successfully"
        });
    } catch (error) {
        console.error("Delete video error:", error);
        res.status(500).json({
            status: "error",
            message: "Error deleting video"
        });
    }
});

// Watch video route
router.get("/watch", async (req, res) => {
    try {
        const video = await Video.findOne({ watch: parseInt(req.query.v) });
        
        if (!video) {
            return res.render("404", {
                isLogin: !!req.session.user_id,
                message: "Video does not exist.",
                url: req.url
            });
        }

        // Increment video views
        await Video.findByIdAndUpdate(video._id, { $inc: { views: 1 } });
        
        // Increment views in user's videos array
        await User.findOneAndUpdate(
            {
                _id: video.user._id,
                "videos._id": video._id
            },
            { $inc: { "videos.$.views": 1 } }
        );

        const user = await User.findById(video.user._id);
        
        res.render("video-page", {
            isLogin: !!req.session.user_id,
            video,
            user,
            url: req.url
        });
    } catch (error) {
        console.error("Watch error:", error);
        res.status(500).send("Error loading video");
    }
});

// Edit page route
router.get("/edit", isLoggedIn, async (req, res) => {
    try {
        const video = await Video.findOne({ watch: parseInt(req.query.v) });
        
        if (!video) {
            return res.render("404", {
                isLogin: true,
                message: "This video does not exist.",
                url: req.url
            });
        }

        if (video.user._id.toString() !== req.session.user_id) {
            return res.send("Sorry you do not own this video.");
        }

        const user = await User.findById(req.session.user_id);
        res.render("edit-video", {
            isLogin: true,
            video,
            user,
            url: req.url
        });
    } catch (error) {
        console.error("Edit page error:", error);
        res.status(500).send("Error loading edit page");
    }
});

// Get related videos route
router.get("/get-related-videos", async (req, res) => {
    try {
        const videos = await Video.find({
            category: req.query.category,
            _id: { $ne: req.query.videoId }
        });
        res.json(videos);
    } catch (error) {
        console.error("Related videos error:", error);
        res.status(500).json({ status: "error", message: "Error fetching related videos" });
    }
});

module.exports = router;