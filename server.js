const express = require("express");
const app = express();
const http = require("http").createServer(app);
const socketIO = require("socket.io")(http);
const formidable = require("formidable");
const fileSystem = require("fs");
const mongoClient = require("mongodb").MongoClient;
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const { ObjectId } = require("mongodb");
const { getVideoDurationInSeconds } = require("get-video-duration");

// Import existing routers
const authRouter = require("./routes/auth");
const mainRouter = require("./routes/main");
const videoRouter = require("./routes/video");
const channelRouter = require("./routes/channel");
const interactionRouter = require("./routes/interaction");
const searchRoutes = require('./routes/search');

const settingsRoutes = require('./routes/settings');
// New streaming router
const streamRouter = require("./routes/stream");
const mainURL = "http://localhost:3000";

var nodemailer = require("nodemailer");
app.use(express.json());

app.use(bodyParser.json({ limit: "10000mb" }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "10000mb",
    parameterLimit: 1000000,
  })
);

app.use(
  expressSession({
    key: "user_id",
    secret: "User secret object ID",
    resave: true,
    saveUninitialized: true,
  })
);

app.use("/public", express.static(__dirname + "/public"));
app.set("view engine", "ejs");

let database = null;

mongoClient.connect(
  "mongodb://localhost:27017",
  { useUnifiedTopology: true },
  function (error, client) {
    if (error) {
      console.log(error);
      return;
    }
    database = client.db("youtube");

    // Share database with routers
    app.locals.database = database;
  }
);

// Export getUser function for use in routers
getUser = function (userId, callBack) {
  database.collection("users").findOne(
    {
      _id: ObjectId(userId),
    },
    function (error, result) {
      if (error) {
        console.log(error);
        return;
      }
      if (callBack != null) {
        callBack(result);
      }
    }
  );
};

module.exports = getUser;

// Make getUser available to routers
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


http.listen(
  3000,
  function () {
    console.log("Server started at http://localhost:3000/");



  

    app.post("/update-social-media-link", function (request, result) {
      result.json({
        status: "success",
        message: "Video has been liked",
      });
    });

    app.get("/delete-video", function (request, result) {
      if (request.session.user_id) {
        database.collection("videos").findOne(
          {
            $and: [
              {
                "user._id": ObjectId(request.session.user_id),
              },
              {
                watch: parseInt(request.query.v),
              },
            ],
          },
          function (error1, video) {
            if (video == null) {
              result.render("404", {
                isLogin: true,
                message: "Sorry, you do not own this video.",
              });
            } else {
              database.collection("videos").findOne(
                {
                  _id: ObjectId(video._id),
                },
                function (error3, videoData) {
                  fileSystem.unlink(videoData.filePath, function (errorUnlink) {
                    if (errorUnlink) {
                      console.log(errorUnlink);
                    }

                    database.collection("videos").remove({
                      $and: [
                        {
                          _id: ObjectId(video._id),
                        },
                        {
                          "user._id": ObjectId(request.session.user_id),
                        },
                      ],
                    });
                  });
                }
              );

              database.collection("users").findOneAndUpdate(
                {
                  _id: ObjectId(request.session.user_id),
                },
                {
                  $pull: {
                    videos: {
                      _id: ObjectId(video._id),
                    },
                  },
                },
                function (error2, data) {
                  result.redirect("/my_channel");
                }
              );
            }
          }
        );
      } else {
        result.redirect("/login");
      }
    });
  }
  // end of Mongo DB
); //  end of HTTP.listen









