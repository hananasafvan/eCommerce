const express = require("express");
const router = express.Router();
const productController = require("../controllers/user/productController");

// Route to display products on Home/Shop pages
router.get("/shop", productController.getProducts);

// Route to display product details when a product is clicked
router.get("/product/:id", productController.getProductDetails);

module.exports = router;
