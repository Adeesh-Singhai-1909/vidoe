const express = require('express');
const router = express.Router();
const formidable = require("formidable");
const fileSystem = require("fs");
const ObjectId = require("mongodb").ObjectId;
const { getVideoDurationInSeconds } = require('get-video-duration');

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

router.get("/upload", isLoggedIn, function (request, result) {
    const getUser = request.app.get('getUser');
    getUser(request.session.user_id, function (user) {
        result.render("upload", {
            isLogin: true,
            user: user,
            url: request.url
        });
    });
});

router.get("/get_user", isLoggedIn, function (request, result) {
    const getUser = request.app.get('getUser');
    getUser(request.session.user_id, function (user) {
        if (user == null) {
            result.json({
                status: "error",
                message: "User not found"
            });
        } else {
            delete user.password;
            result.json({
                status: "success",
                message: "Record has been fetched",
                user: user
            });
        }
    });
});

router.post("/upload-video", isLoggedIn, function (request, result) {
    const database = request.app.locals.database;
    const getUser = request.app.get('getUser');
    var formData = new formidable.IncomingForm();
    formData.maxFileSize = 1000 * 1024 * 1204;
    
    formData.parse(request, function (error1, fields, files) {
        var oldPath = files.video.path;
        var newPath = "public/videos/" + new Date().getTime() + "-" + files.video.name;

        var oldPathThumbnail = files.thumbnail.path;
        var thumbnail = "public/thumbnails/" + new Date().getTime() + "-" + files.thumbnail.name;

        const { title, description, tags, videoId, category } = fields;

        fileSystem.rename(oldPathThumbnail, thumbnail, function (error2) {
            console.log("thumbnail upload error = ", error2);
        });

        fileSystem.rename(oldPath, newPath, function (error2) {
            getUser(request.session.user_id, function (user) {
                delete user.password;
                var currentTime = new Date().getTime();

                getVideoDurationInSeconds(newPath).then((duration) => {
                    var hours = Math.floor(duration / 60 / 60);
                    var minutes = Math.floor(duration / 60) - hours * 60;
                    var seconds = Math.floor(duration % 60);

                    const videoData = {
                        user: {
                            _id: user._id,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            image: user.image,
                            subscribers: user.subscribers
                        },
                        filePath: newPath,
                        createdAt: currentTime,
                        views: 0,
                        watch: currentTime,
                        minutes, seconds, hours,
                        title, description, tags,
                        category: category,
                        thumbnail
                    };

                    database.collection("videos").insertOne(videoData, function (error3, data) {
                        const userVideoData = { ...videoData, _id: data.insertedId };
                        delete userVideoData.user;

                        database.collection("users").updateOne(
                            {
                                _id: ObjectId(request.session.user_id)
                            },
                            {
                                $push: {
                                    videos: userVideoData
                                }
                            },
                            function (error4, data1) {
                                result.redirect("/edit?v=" + currentTime);
                            }
                        );
                    });
                });
            });
        });
    });
});

router.post("/save-video", isLoggedIn, function (request, result) {
    const database = request.app.locals.database;
    const { title, description, tags, videoId, category, minutes, seconds } = request.body;

    database.collection("users").findOne({
        _id: ObjectId(request.session.user_id),
        "videos._id": ObjectId(videoId)
    }, function (error1, video) {
        if (video == null) {
            result.send("Sorry you do not own this video");
        } else {
            const updateData = {
                title, description, tags, 
                category, minutes, seconds
            };

            database.collection("videos").updateOne(
                {
                    _id: ObjectId(videoId)
                },
                {
                    $set: updateData
                },
                function (error1, data) {
                    database.collection("users").findOneAndUpdate(
                        {
                            $and: [{
                                _id: ObjectId(request.session.user_id)
                            },
                            {
                                "videos._id": ObjectId(videoId)
                            }]
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
                        },
                        function (error2, data1) {
                            result.json({
                                status: "success",
                                message: "Video has been published"
                            });
                        }
                    );
                }
            );
        }
    });
});

router.post("/edit", isLoggedIn, function (request, result) {
    const database = request.app.locals.database;
    const getUser = request.app.get('getUser');
    
    var formData = new formidable.IncomingForm();
    formData.parse(request, function (error1, fields, files) {
        const { title, description, tags, videoId } = fields;
        let thumbnail = fields.thumbnailPath;

        if (files.thumbnail.size > 0) {
            if (typeof fields.thumbnailPath !== "undefined" && fields.thumbnailPath != "") {
                fileSystem.unlink(fields.thumbnailPath, function (error3) {
                    //
                });
            }

            var oldPath = files.thumbnail.path;
            var newPath = "public/thumbnails/" + new Date().getTime() + "-" + files.thumbnail.name;
            thumbnail = newPath;

            fileSystem.rename(oldPath, newPath, function (error2) {
                //
            });
        }

        database.collection("users").findOne({
            _id: ObjectId(request.session.user_id),
            "videos._id": ObjectId(videoId)
        }, function (error1, video) {
            if (video == null) {
                result.send("Sorry you do not own this video");
            } else {
                const updateData = {
                    title, description, tags,
                    category: fields.category,
                    thumbnail
                };

                database.collection("videos").findOneAndUpdate({
                    _id: ObjectId(videoId)
                }, {
                    $set: updateData
                }, function (error1, data) {
                    database.collection("users").findOneAndUpdate({
                        $and: [{
                            _id: ObjectId(request.session.user_id)
                        }, {
                            "videos._id": ObjectId(videoId)
                        }]
                    }, {
                        $set: {
                            "videos.$.title": title,
                            "videos.$.description": description,
                            "videos.$.tags": tags,
                            "videos.$.category": fields.category,
                            "videos.$.thumbnail": thumbnail
                        }
                    }, function (error2, data1) {
                        getUser(request.session.user_id, function (user) {
                            var video = data.value;
                            video.thumbnail = thumbnail;

                            result.render("edit-video", {
                                isLogin: true,
                                video: video,
                                user: user,
                                url: request.url,
                                message: "Video has been saved"
                            });
                        });
                    });
                });
            }
        });
    });
});

router.get("/watch", function (request, result) {
    const database = request.app.locals.database;
    const getUser = request.app.get('getUser');

    database.collection("videos").findOne({
        watch: parseInt(request.query.v)
    }, function (error1, video) {
        if (video == null) {
            result.render("404", {
                isLogin: request.session.user_id ? true : false,
                message: "Video does not exist.",
                url: request.url
            });
        } else {
            database.collection("videos").updateOne({
                _id: ObjectId(video._id)
            }, {
                $inc: {
                    views: 1
                }
            });

            database.collection("users").updateOne({
                $and: [{
                    _id: ObjectId(video.user._id)
                }, {
                    "videos._id": ObjectId(video._id)
                }]
            }, {
                $inc: {
                    "videos.$.views": 1
                }
            });

            getUser(video.user._id, function (user) {
                result.render("video-page", {
                    isLogin: request.session.user_id ? true : false,
                    video: video,
                    user: user,
                    url: request.url
                });
            });
        }
    });
});

// Add these routes to your existing video.js file

router.get("/edit", isLoggedIn, function (request, result) {
    const database = request.app.locals.database;
    const getUser = request.app.get('getUser');

    database.collection("videos").findOne({
        watch: parseInt(request.query.v)
    }, function (error1, video) {
        if (video == null) {
            result.render("404", {
                isLogin: true,
                message: "This video does not exist.",
                url: request.url
            });
        } else {
            if (video.user._id != request.session.user_id) {
                result.send("Sorry you do not own this video.");
            } else {
                getUser(request.session.user_id, function (user) {
                    result.render("edit-video", {
                        isLogin: true,
                        video: video,
                        user: user,
                        url: request.url
                    });
                });
            }
        }
    });
});

router.get("/get-related-videos", function (request, result) {
    const database = request.app.locals.database;
    
    database.collection("videos")
        .find({
            $and: [{
                category: request.query.category
            }, {
                _id: {
                    $ne: ObjectId(request.query.videoId)
                }
            }]
        })
        .toArray(function (error1, videos) {
            result.json(videos);
        });
});

module.exports = router;