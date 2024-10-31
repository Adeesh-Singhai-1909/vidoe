const express = require('express');
const router = express.Router();
const { Video } = require('../models/User'); // Import the Video model

router.get("/", async function (request, result) {
    try {
        // Get all videos sorted by creation date (newest first)
        const videos = await Video.find({})
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for better performance since we only need JSON data

        result.render("index", {
            isLogin: request.session.user_id ? true : false,
            videos: videos,
            url: request.url
        });
    } catch (error) {
        console.error('Error fetching videos:', error);
        result.render("index", {
            isLogin: request.session.user_id ? true : false,
            videos: [],
            url: request.url,
            error: "Error loading videos"
        });
    }
});

module.exports = router;