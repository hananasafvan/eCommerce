const express = require("express");
const router = express.Router();
const productController = require("../controllers/user/productController");


router.get("/shop", productController.getProducts);


router.get("/product/:id", productController.getProductDetails);


router.get('/forgot-password', productController.getForgotpassword)
router.post('/forgot-email-valid')


module.exports = router;
