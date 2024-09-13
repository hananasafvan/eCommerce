const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const { userAuth } = require("../middleweares/auth");

router.get("/pageNotFound", userController.pageNotFound);
router.get("/signup", userController.loadSignup);
router.get("/pageNotFound", userController.pageNotFound); //for error handil
router.get("/", userController.loadHomepage);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);



//google auth routes
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  userController.googleCallback
);


router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userAuth, userController.logout);


module.exports = router;
