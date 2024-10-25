const express = require('express');
const router = express.Router();
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcrypt');

function getUser(userId, callback) {
  // Implement this function to fetch user data
}

router.get("/", function (req, res) {
  if (req.session.user_id) {
    getUser(req.session.user_id, function (user) {
      res.render("settings", {
        isLogin: true,
        user: user,
        message: req.query.message ? "Settings has been saved" : "",
        error: req.query.error ? "Please fill all fields" : "",
        url: req.url,
      });
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/save", function (req, res) {
  if (req.session.user_id) {
    var password = req.body.password;

    if (req.body.first_name == "" || req.body.last_name == "") {
      res.redirect("/my_settings?error=1");
      return;
    }

    const updateUser = (hash = null) => {
      const updateData = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
      };
      if (hash) updateData.password = hash;

      req.app.locals.database.collection("users").updateOne(
        { _id: ObjectId(req.session.user_id) },
        { $set: updateData }
      );

      // Update other collections
      const fullName = `${req.body.first_name} ${req.body.last_name}`;
      req.app.locals.database.collection("users").updateMany(
        { "subscriptions.channelId": ObjectId(req.session.user_id) },
        { $set: { "subscriptions.$.channelName": fullName } }
      );

      req.app.locals.database.collection("users").updateMany(
        { "subscriptions.subscribers.userId": ObjectId(req.session.user_id) },
        { $set: { "subscriptions.subscribers.$.channelName": fullName } }
      );

      req.app.locals.database.collection("users").updateMany(
        { "subscribers.userId": ObjectId(req.session.user_id) },
        { $set: { "subscribers.$.channelName": fullName } }
      );

      req.app.locals.database.collection("videos").updateMany(
        { "user._id": ObjectId(req.session.user_id) },
        { $set: { "user.first_name": req.body.first_name, "user.last_name": req.body.last_name } }
      );

      res.redirect("/my_settings?message=1");
    };

    if (password) {
      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, function (err, hash) {
          updateUser(hash);
        });
      });
    } else {
      updateUser();
    }
  } else {
    res.redirect("/login");
  }
});

module.exports = router;