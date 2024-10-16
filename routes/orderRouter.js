const express = require("express");
const router = express.Router();
const orderController = require("../controllers/user/orderController");
const { userAuth } = require("../middleweares/auth");

router.get("/checkout", userAuth, orderController.getOrderPage);
router.post("/place", userAuth, orderController.placeOrder);
router.get('/details/:orderId',userAuth, orderController.getOrderDetails);



router.get("/history", userAuth, orderController.getOrderHistory);

router.post("/cancel/:orderId/:itemId", userAuth, orderController.cancelItem);
router.post("/return/:orderId/:itemId",userAuth,orderController.returnItem)

//router.post('/apply-coupon',userAuth, orderController.applyCoupon);

module.exports = router;
