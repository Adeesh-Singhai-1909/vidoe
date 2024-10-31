const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const { User } = require('../models/User'); // Import the User model

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

router.post("/register", async function (request, result) {
    const { first_name, last_name, email, password } = request.body;

    if (first_name == "" || last_name == "" || email == "" || password == "") {
        result.render("register", {
            "error": "Please fill all fields",
            "message": ""
        });
        return;
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        
        if (!existingUser) {
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            // Create new user
            const newUser = new User({
                first_name,
                last_name,
                email,
                password: hash,
                subscribers: []
            });

            await newUser.save();

            result.render("register", {
                "error": "Email verification is in premium version. Kindly read README.txt to get full version.",
                "message": "Signed up successfully. You can login now."
            });
        } else {
            result.render("register", {
                "error": "Email already exists",
                "message": ""
            });
        }
    } catch (error) {
        console.error(error);
        result.render("register", {
            "error": "An error occurred during registration",
            "message": ""
        });
    }
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

router.post("/login", async function (request, result) {
    const { email, password } = request.body;

    if (email == "" || password == "") {
        result.render("login", {
            "error": "Please fill all fields",
            "message": ""
        });
        return;
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            result.render("login", {
                "error": "Email does not exist",
                "message": ""
            });
        } else {
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                request.session.user_id = user._id;
                result.redirect("/");
            } else {
                result.render("login", {
                    "error": "Password is not correct",
                    "message": ""
                });
            }
        }
    } catch (error) {
        console.error(error);
        result.render("login", {
            "error": "An error occurred during login",
            "message": ""
        });
    }
});

router.get("/logout", function (request, result) {
    request.session.destroy();
    result.redirect("/login");
});

module.exports = router;