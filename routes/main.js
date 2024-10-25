const express = require('express');
const router = express.Router();

router.get("/", function (request, result) {
    const database = request.app.locals.database;
    
    database.collection("videos").find({}).sort({"createdAt": -1}).toArray(function (error1, videos) {
        result.render("index", {
            "isLogin": request.session.user_id ? true : false,
            "videos": videos,
            "url": request.url
        });
    });
});

module.exports = router;