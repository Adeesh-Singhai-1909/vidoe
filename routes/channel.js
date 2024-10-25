const express = require('express');
const router = express.Router();
const ObjectId = require("mongodb").ObjectId;



const isLoggedIn = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.redirect("/login");
    }
};

router.get("/", function (request, result) {
    const database = request.app.locals.database;

    database.collection("users").findOne({
        _id: ObjectId(request.query.c)
    }, function (error1, user) {
        if (user == null) {
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
    });
});

router.get("/my_channel", isLoggedIn, function (request, result) {
    const database = request.app.locals.database;
    
    database.collection("users").findOne({
        _id: ObjectId(request.session.user_id)
    }, function (error1, user) {
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
    });
});

module.exports = router;