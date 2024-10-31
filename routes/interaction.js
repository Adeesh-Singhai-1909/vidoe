const express = require('express');
const router = express.Router();
const { User, Video } = require('../models/User'); // Import the models
const mongoose = require('mongoose');

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.json({
            status: "danger",
            message: "Please login to perform this action."
        });
    }
};

// Helper function to get user info
const getUserInfo = async (userId) => {
    const user = await User.findById(userId).select('-password');
    return {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        image: user.image
    };
};

router.post("/do-like", function (request, result) {
    result.json({
        status: "success",
        message: "Like/dislike feature is in premium version. Kindly read README.txt to get full version."
    });
});

router.post("/do-dislike", function (request, result) {
    result.json({
        status: "success",
        message: "Like/dislike is in premium version. Kindly read README.txt to get full version."
    });
});

router.post("/do-comment", isLoggedIn, async function (request, result) {
    try {
        const { comment, videoId } = request.body;

        // Validate videoId
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return result.json({
                status: "error",
                message: "Invalid video ID"
            });
        }

        const userInfo = await getUserInfo(request.session.user_id);

        const video = await Video.findByIdAndUpdate(
            videoId,
            {
                $push: {
                    comments: {
                        _id: new mongoose.Types.ObjectId(),
                        user: userInfo,
                        comment: comment,
                        createdAt: new Date().getTime()
                    }
                }
            },
            { new: true } // Return the updated document
        );

        if (!video) {
            return result.json({
                status: "error",
                message: "Video not found"
            });
        }

        result.json({
            status: "success",
            message: "Comment has been posted",
            user: userInfo,
            comment: comment
        });
    } catch (error) {
        console.error('Error posting comment:', error);
        result.json({
            status: "error",
            message: "Error posting comment"
        });
    }
});

router.post("/do-reply", isLoggedIn, async function (request, result) {
    try {
        const { reply, commentId } = request.body;

        // Validate commentId
        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return result.json({
                status: "error",
                message: "Invalid comment ID"
            });
        }

        const userInfo = await getUserInfo(request.session.user_id);

        const replyObject = {
            _id: new mongoose.Types.ObjectId(),
            user: userInfo,
            reply: reply,
            createdAt: new Date().getTime()
        };

        const video = await Video.findOneAndUpdate(
            { "comments._id": commentId },
            {
                $push: {
                    "comments.$.replies": replyObject
                }
            },
            { new: true }
        );

        if (!video) {
            return result.json({
                status: "error",
                message: "Comment not found"
            });
        }

        result.json({
            status: "success",
            message: "Reply has been posted",
            user: userInfo,
            reply: reply
        });
    } catch (error) {
        console.error('Error posting reply:', error);
        result.json({
            status: "error",
            message: "Error posting reply"
        });
    }
});

module.exports = router;