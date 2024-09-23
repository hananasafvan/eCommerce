const express = require("express");
const router = express.Router();
const productController = require("../controllers/user/productController");


router.get("/shop", productController.getProducts);


router.get("/product/:id", productController.getProductDetails);


router.get('/forgot-password', productController.getForgotpassword)
router.post('/forgot-email-valid',productController.forgotEmailValid)
router.post('/verify-passForgot-otp',productController.verifyForgotPassOtp)
router.get('/reset-password',productController.getResetPassPage)
router.post('/resend-forgot-otp',productController.resendOtp)
router.post('/reset-password',productController.postNewPassword)


module.exports = router;
