// // routes/stream.js
// const express = require("express");
// const router = express.Router();
// const { ObjectId } = require("mongodb");

// // Middleware to check if user is logged in
// function isLoggedIn(req, res, next) {
//     if (req.session.user) {
//         next();
//     } else {
//         res.redirect("/login");
//     }
// }

// // View live stream
// router.get("/:channelId", async (req, res) => {
//     try {
//         const database = req.app.locals.database;
//         const channel = await database.collection("channels")
//             .findOne({ _id: ObjectId(req.params.channelId) });
        
//         if (!channel) {
//             return res.status(404).render("404");
//         }
        
//         const activeStream = await database.collection("streams")
//             .findOne({ 
//                 channelId: channel._id,
//                 status: "live"
//             });
        
//         res.render("single-channel", {
//             isMyChannel: req.session.user && req.session.user._id.toString() === channel.user._id.toString(),
//             channel: channel,
//             activeStream: activeStream,
//             user: req.session.user
//         });
//     } catch (error) {
//         console.error("Error fetching stream:", error);
//         res.status(500).render("error", { error: "Error fetching stream" });
//     }
// });

// module.exports = router;