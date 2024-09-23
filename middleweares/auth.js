const User = require("../models/userSchema");
const Address = require('../models/addressSchema')

const userAuth = async (req, res, next) => {
  console.log('Session data:', req.session); 
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user);
      if (user && !user.isBlocked) {
        return next(); // User is authenticated and not blocked
      } else {
        // If user is blocked, destroy session and redirect to login
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).send("Internal server error");
          }
          res.redirect("/login"); // Redirect to login page if blocked
        });
      }
    } catch (error) {
      console.error("Error checking user status:", error);
      res.status(500).send("Internal server error");
    }
  } else {
    res.redirect("/login"); // No session, redirect to login
  }
};






const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data) {
        next();
      } else {
        res.redirect("/admin/login");
      }
    })
    .catch((error) => {
      console.log("error in admin auth", error);
      res.status(500).send("internel sever error");
    });
};

module.exports = {
  userAuth,
  adminAuth,
};
