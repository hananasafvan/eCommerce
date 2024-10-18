const express = require("express");
const router = express.Router();
const orderController = require("../controllers/user/orderController");
const { userAuth } = require("../middleweares/auth");
const razorpayController = require("../controllers/user/razorpayController");

router.get("/checkout", userAuth, orderController.getOrderPage);
router.post("/place", userAuth, orderController.placeOrder);
router.get("/details/:orderId", userAuth, orderController.getOrderDetails);

router.post(
  "/razorpay/create-order/:orderId",
  userAuth,
  razorpayController.createRazorpayOrder
);

router.post("/razorpay/verify", razorpayController.verifyPayment);

router.get("/history", userAuth, orderController.getOrderHistory);

router.post("/cancel/:orderId/:itemId", userAuth, orderController.cancelItem);
router.post("/return/:orderId/:itemId", userAuth, orderController.returnItem);

module.exports = router;
