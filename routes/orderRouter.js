const express = require("express");
const router = express.Router();
const orderController = require("../controllers/user/orderController");
const { userAuth } = require("../middleweares/auth");
const razorpayController = require("../controllers/user/razorpayController");
const walletController = require('../controllers/user/walletController')
const razorpayRoutes = require('../routes/razorpayRoutes'); 


router.get("/checkout", userAuth, orderController.getOrderPage);
router.post("/place", userAuth, orderController.placeOrder);
router.get("/details/:orderId", userAuth, orderController.getOrderDetails);

router.post('/place', orderController.placeOrder);
router.use('/razorpay', razorpayRoutes);

router.get("/history", userAuth, orderController.getOrderHistory);

router.post("/cancel/:orderId/:itemId", userAuth, orderController.cancelItem);
router.post("/return/:orderId/:itemId", userAuth, orderController.returnItem);


router.get('/wallet',userAuth, walletController.showWallet);
router.post('/wallet/update',userAuth ,walletController.updateWallet);


router.post('/create_order',userAuth,razorpayController.createOrder)

router.post('/success', userAuth, async (req, res) => {
    const { orderId, paymentId } = req.body;
  
    // Find the order in your database and update its status
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }
  
    // Update the order status to 'Paid'
    order.status = "Paid";
    order.paymentId = paymentId;
    await order.save();
  
    // Send success response or redirect
    res.render("payment-success", { order });
  });
  
  router.post('/failed', userAuth, (req, res) => {
    // Handle payment failure
    res.render("payment-failure"); // Render a failure page
  });
  



module.exports = router;
