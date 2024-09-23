const express = require("express");
const router = express.Router();
const orderController = require("../controllers/user/orderController");
const { userAuth } = require("../middleweares/auth");

router.get("/checkout", userAuth, orderController.getOrderPage);
router.post("/place", userAuth, orderController.placeOrder);

router.get("/history", userAuth, orderController.getOrderHistory);
router.post("/cancel/:orderId", userAuth, orderController.cancelOrder);


module.exports = router;
