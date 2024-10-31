const express = require('express');
const router = express.Router();
const { User } = require('../models/User'); // Import the User model
const mongoose = require('mongoose');

const isLoggedIn = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.redirect("/login");
    }
};

router.get("/", async function (request, result) {
    try {
        // Validate if the channel ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(request.query.c)) {
            return result.render("404", {
                isLogin: request.session.user_id ? true : false,
                message: "Invalid channel ID",
                url: request.url
            });
        }

        const user = await User.findById(request.query.c);

        if (!user) {
            result.render("404", {
                isLogin: request.session.user_id ? true : false,
                message: "Channel not found",
                url: request.url
            });
        } else {
            result.render("single-channel", {
                isLogin: request.session.user_id ? true : false,
                user: user,
                headerClass: "single-channel-page",
                footerClass: "ml-0",
                isMyChannel: request.session.user_id == request.query.c,
                url: request.url,
                message: request.query.message ? request.query.message : "",
                error: request.query.error ? request.query.error : ""
            });
        }
    } catch (error) {
        console.error('Error fetching channel:', error);
        result.render("404", {
            isLogin: request.session.user_id ? true : false,
            message: "Error loading channel",
            url: request.url
        });
    }
});

router.get("/my_channel", isLoggedIn, async function (request, result) {
    try {
        const user = await User.findById(request.session.user_id);

        if (!user) {
            return result.redirect("/login");
        }

        result.render("single-channel", {
            isLogin: true,
            user: user,
            headerClass: "single-channel-page",
            footerClass: "ml-0",
            isMyChannel: true,
            message: request.query.message ? request.query.message : "",
            error: request.query.error ? request.query.error : "",
            url: request.url
        });
    } catch (error) {
        console.error('Error fetching my channel:', error);
        result.render("404", {
            isLogin: true,
            message: "Error loading your channel",
            url: request.url
        });
    }
});

module.exports = router;