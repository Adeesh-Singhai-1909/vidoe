const express = require('express');
const router = express.Router();
const { Video } = require('../models/User'); // Import the Video model

router.get("/", async function (req, res) {
    try {
        // Validate search query
        if (!req.query.search_query) {
            return res.render("search-query", {
                isLogin: req.session.user_id ? true : false,
                videos: [],
                query: "",
                url: req.url,
                message: "Please enter a search term"
            });
        }

        // Escape special regex characters to prevent injection
        const escapedSearchQuery = req.query.search_query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Find videos matching the search query
        const videos = await Video.find({
            title: {
                $regex: escapedSearchQuery,
                $options: "i" // case-insensitive
            }
        })
        .sort({ createdAt: -1 }) // Sort by newest first
        .lean(); // Use lean() for better performance

        res.render("search-query", {
            isLogin: req.session.user_id ? true : false,
            videos: videos,
            query: req.query.search_query,
            url: req.url,
            message: videos.length === 0 ? "No videos found matching your search" : ""
        });
    } catch (error) {
        console.error('Error searching videos:', error);
        res.render("search-query", {
            isLogin: req.session.user_id ? true : false,
            videos: [],
            query: req.query.search_query,
            url: req.url,
            error: "Error performing search"
        });
    }
});

// Add advanced search route (optional enhancement)
router.get("/advanced", async function (req, res) {
    try {
        const { search_query, category, date_range } = req.query;

        // Build search criteria
        const searchCriteria = {};
        
        if (search_query) {
            const escapedSearchQuery = search_query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            searchCriteria.title = {
                $regex: escapedSearchQuery,
                $options: "i"
            };
        }

        if (category) {
            searchCriteria.category = category;
        }

        if (date_range) {
            const date = new Date();
            switch (date_range) {
                case 'today':
                    date.setHours(0, 0, 0, 0);
                    searchCriteria.createdAt = { $gte: date.getTime() };
                    break;
                case 'week':
                    date.setDate(date.getDate() - 7);
                    searchCriteria.createdAt = { $gte: date.getTime() };
                    break;
                case 'month':
                    date.setMonth(date.getMonth() - 1);
                    searchCriteria.createdAt = { $gte: date.getTime() };
                    break;
            }
        }

        const videos = await Video.find(searchCriteria)
            .sort({ createdAt: -1 })
            .lean();

        res.render("search-query", {
            isLogin: req.session.user_id ? true : false,
            videos: videos,
            query: search_query,
            url: req.url,
            message: videos.length === 0 ? "No videos found matching your criteria" : ""
        });
    } catch (error) {
        console.error('Error performing advanced search:', error);
        res.render("search-query", {
            isLogin: req.session.user_id ? true : false,
            videos: [],
            query: req.query.search_query,
            url: req.url,
            error: "Error performing advanced search"
        });
    }
});

module.exports = router;