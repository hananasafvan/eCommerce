const express = require("express");
const router = express.Router();
const orderController = require("../controllers/user/orderController");
const { userAuth } = require("../middleweares/auth");
const razorpayController = require("../controllers/user/razorpayController");
const walletController = require('../controllers/user/walletController')

router.get("/checkout", userAuth, orderController.getOrderPage);
router.post("/place", userAuth, orderController.placeOrder);
router.get("/details/:orderId", userAuth, orderController.getOrderDetails);

router.post(
  "/razorpay/create-order/:orderId",
  userAuth,
  razorpayController.createRazorpayOrder
);

router.post("/razorpay/verify",userAuth, razorpayController.verifyPayment);

router.get("/history", userAuth, orderController.getOrderHistory);

router.post("/cancel/:orderId/:itemId", userAuth, orderController.cancelItem);
router.post("/return/:orderId/:itemId", userAuth, orderController.returnItem);


router.get('/wallet',userAuth, walletController.showWallet);
//router.post('/updateWallet/:userId',userAuth, walletController.updateWallet);
router.post('/wallet/update',userAuth ,walletController.updateWallet);




module.exports = router;
