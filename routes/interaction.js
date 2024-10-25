const express = require('express');
const router = express.Router();
const ObjectId = require("mongodb").ObjectId;

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

router.post("/do-comment", isLoggedIn, function (request, result) {
    const database = request.app.locals.database;
    const getUser = request.app.get('getUser');
    
    const { comment, videoId } = request.body;

    getUser(request.session.user_id, function (user) {
        delete user.password;

        const userInfo = {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            image: user.image
        };

        database.collection("videos").findOneAndUpdate({
            _id: ObjectId(videoId)
        }, {
            $push: {
                comments: {
                    _id: ObjectId(),
                    user: userInfo,
                    comment: comment,
                    createdAt: new Date().getTime()
                }
            }
        }, function (error1, data) {
            result.json({
                status: "success",
                message: "Comment has been posted",
                user: userInfo,
                comment: comment
            });
        });
    });
});

router.post("/do-reply", isLoggedIn, function (request, result) {
    const database = request.app.locals.database;
    const getUser = request.app.get('getUser');
    
    const { reply, commentId } = request.body;

    getUser(request.session.user_id, function (user) {
        delete user.password;

        const userInfo = {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            image: user.image
        };

        const replyObject = {
            _id: ObjectId(),
            user: userInfo,
            reply: reply,
            createdAt: new Date().getTime()
        };

        database.collection("videos").findOneAndUpdate({
            "comments._id": ObjectId(commentId)
        }, {
            $push: {
                "comments.$.replies": replyObject
            }
        }, function (error1, data) {
            result.json({
                status: "success",
                message: "Reply has been posted",
                user: userInfo,
                reply: reply
            });
        });
    });
});

module.exports = router;