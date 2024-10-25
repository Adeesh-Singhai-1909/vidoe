const express = require('express');
const router = express.Router();

router.get("/", function (req, res) {
  req.app.locals.database
    .collection("videos")
    .find({
      title: {
        $regex: req.query.search_query,
        $options: "i",
      },
    })
    .toArray(function (error1, videos) {
      res.render("search-query", {
        isLogin: req.session.user_id ? true : false,
        videos: videos,
        query: req.query.search_query,
        url: req.url,
      });
    });
});

module.exports = router;