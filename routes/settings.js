const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Video } = require('../models/User');

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.redirect("/login");
    }
};

// Helper function to get user data
const getUser = async (userId) => {
    try {
        return await User.findById(userId);
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

router.get("/", isLoggedIn, async function (req, res) {
    try {
        const user = await getUser(req.session.user_id);
        
        if (!user) {
            return res.redirect("/login");
        }

        res.render("settings", {
            isLogin: true,
            user: user,
            message: req.query.message ? "Settings has been saved" : "",
            error: req.query.error ? "Please fill all fields" : "",
            url: req.url
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.render("settings", {
            isLogin: true,
            error: "Error loading user settings",
            url: req.url
        });
    }
});

router.post("/save", isLoggedIn, async function (req, res) {
    try {
        const { first_name, last_name, password } = req.body;

        // Validate required fields
        if (!first_name || !last_name) {
            return res.redirect("/my_settings?error=1");
        }

        // Start a session for atomic operations
        const session = await User.startSession();
        session.startTransaction();

        try {
            // Prepare update data
            const updateData = {
                first_name,
                last_name
            };

            // Handle password update if provided
            if (password) {
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                updateData.password = hash;
            }

            // Update user document
            const updatedUser = await User.findByIdAndUpdate(
                req.session.user_id,
                { $set: updateData },
                { new: true, session }
            );

            if (!updatedUser) {
                throw new Error('User not found');
            }

            const fullName = `${first_name} ${last_name}`;

            // Update subscriptions in other users' documents
            await User.updateMany(
                { "subscriptions.channelId": req.session.user_id },
                { $set: { "subscriptions.$.channelName": fullName } },
                { session }
            );

            // Update subscribers in users' documents
            await User.updateMany(
                { "subscribers.userId": req.session.user_id },
                { $set: { "subscribers.$.channelName": fullName } },
                { session }
            );

            // Update user information in videos
            await Video.updateMany(
                { "user._id": req.session.user_id },
                {
                    $set: {
                        "user.first_name": first_name,
                        "user.last_name": last_name
                    }
                },
                { session }
            );

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            res.redirect("/my_settings?message=1");
        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        res.redirect("/my_settings?error=1");
    }
});

// Add route for updating profile image (optional enhancement)
router.post("/update-image", isLoggedIn, async function (req, res) {
    try {
        const { image } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.session.user_id,
            { $set: { image } },
            { new: true }
        );

        if (!updatedUser) {
            return res.json({
                status: "error",
                message: "User not found"
            });
        }

        // Update user image in videos
        await Video.updateMany(
            { "user._id": req.session.user_id },
            { $set: { "user.image": image } }
        );

        res.json({
            status: "success",
            message: "Profile image updated successfully"
        });
    } catch (error) {
        console.error('Error updating profile image:', error);
        res.json({
            status: "error",
            message: "Error updating profile image"
        });
    }
});

module.exports = router;