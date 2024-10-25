const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");

router.get("/register", function (request, result) {
    if (request.session.user_id) {
        result.redirect("/");
        return;
    }
    result.render("register", {
        "error": "",
        "message": ""
    });
});

router.post("/register", function (request, result) {
    const database = request.app.locals.database;
    const { first_name, last_name, email, password } = request.body;

    if (first_name == "" || last_name == "" || email == "" || password == "") {
        result.render("register", {
            "error": "Please fill all fields",
            "message": ""
        });
        return;
    }

    database.collection("users").findOne({
        "email": email
    }, function (error1, user) {
        if (error1) {
            console.log(error1);
            return;
        }

        if (user == null) {
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(password, salt, async function(err, hash) {
                    database.collection("users").insertOne({
                        "first_name": first_name,
                        "last_name": last_name,
                        "email": email,
                        "password": hash,
                        "subscribers": []
                    }, function (error2, data) {
                        if (error2) {
                            console.log(error2);
                            return;
                        }

                        result.render("register", {
                            "error": "Email verification is in premium version. Kindly read README.txt to get full version.",
                            "message": "Signed up successfully. You can login now."
                        });
                    });
                })
            })
        } else {
            result.render("register", {
                "error": "Email already exists",
                "message": ""
            });
        }
    });
});

router.get("/login", function (request, result) {
    if (request.session.user_id) {
        result.redirect("/");
        return;
    }
    result.render("login", {
        "error": "",
        "message": ""
    });
});

router.post("/login", function (request, result) {
    const database = request.app.locals.database;
    const { email, password } = request.body;

    if (email == "" || password == "") {
        result.render("login", {
            "error": "Please fill all fields",
            "message": ""
        });
        return;
    }

    database.collection("users").findOne({
        "email": email
    }, function (error1, user) {
        if (error1) {
            console.log(error1);
            return;
        }

        if (user == null) {
            result.render("login", {
                "error": "Email does not exist",
                "message": ""
            });
        } else {
            bcrypt.compare(password, user.password, function (error2, res) {
                if (res === true) {
                    request.session.user_id = user._id;
                    result.redirect("/");
                } else {
                    result.render("login", {
                        "error": "Password is not correct",
                        "message": ""
                    });
                }
            });
        }
    });
});

router.get("/logout", function (request, result) {
    request.session.destroy();
    result.redirect("/login");
});

module.exports = router;