if(process.env.NODE_ENV!=='production'){
  require("dotenv").config();

}


const express = require("express");
const app = express();
const http = require("http").createServer(app);
const socketIO = require("socket.io")(http);
const formidable = require("formidable");
const fileSystem = require("fs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const nodemailer = require("nodemailer");

// Import models
const { User, Video } = require("./models/User");
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Import existing routers
const authRouter = require("./routes/auth");
const mainRouter = require("./routes/main");
const videoRouter = require("./routes/video");
const channelRouter = require("./routes/channel");
const interactionRouter = require("./routes/interaction");
const searchRoutes = require('./routes/search');
const settingsRoutes = require('./routes/settings');
const streamRouter = require("./routes/stream");

const mainURL = "http://localhost:3000";

// Middleware setup
app.use(express.json());
app.use(bodyParser.json({ limit: "10000mb" }));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: "10000mb",
  parameterLimit: 1000000,
}));

app.use(expressSession({
  key: "user_id",
  secret: "User secret object ID",
  resave: true,
  saveUninitialized: true,
}));

app.use("/public", express.static(__dirname + "/public"));
app.set("view engine", "ejs");

const dbUrl = process.env.ATLASDB_URL ;

// Connect to MongoDB using Mongoose
main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);
  console.log("Connected to DB");
}

// Helper function to get user (now using Mongoose)
const getUser = async (userId) => {
  try {
    return await User.findById(userId);
  } catch (error) {
    console.error("Error in getUser:", error);
    return null;
  }
};

// Make getUser available to routes
app.set("getUser", getUser);

// Use routers
app.use("/", mainRouter);
app.use("/", authRouter);
app.use("/", videoRouter);
app.use("/", channelRouter);
app.use("/video", videoRouter);
app.use("/channel", channelRouter);
app.use("/", interactionRouter);
app.use('/search', searchRoutes);
app.use('/my_settings', settingsRoutes);

// Update social media link endpoint
app.post("/update-social-media-link", (req, res) => {
  res.json({
    status: "success",
    message: "Video has been liked",
  });
});

// Delete video endpoint (updated to use Mongoose)
app.get("/delete-video", async (req, res) => {
  if (!req.session.user_id) {
    return res.redirect("/login");
  }

  try {
    // Find the video
    const video = await Video.findOne({
      'user._id': req.session.user_id,
      watch: parseInt(req.query.v)
    });

    if (!video) {
      return res.render("404", {
        isLogin: true,
        message: "Sorry, you do not own this video.",
      });
    }

    // Delete the video file
    try {
      await fileSystem.promises.unlink(video.filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
    }

    // Remove video from Videos collection
    await Video.findByIdAndDelete(video._id);

    // Remove video from user's videos array
    await User.findByIdAndUpdate(req.session.user_id, {
      $pull: {
        videos: {
          _id: video._id
        }
      }
    });

    res.redirect("/my_channel");
  } catch (error) {
    console.error("Error in delete-video:", error);
    res.status(500).send("Error deleting video");
  }
});

// Start server
http.listen(3000, () => {
  console.log("Server started at http://localhost:3000/");
});







