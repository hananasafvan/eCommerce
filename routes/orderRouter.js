const express = require("express");
const router = express.Router();
const orderController = require("../controllers/user/orderController");
const addressController = require('../controllers/user/addressController')
const { userAuth } = require("../middleweares/auth");
const bodyParser = require('body-parser')

const path = require("path")
const walletController = require('../controllers/user/walletController')
const paymentController = require('../controllers/user/paymentController')



router.get("/checkout", userAuth, orderController.getOrderPage);
router.post("/place", userAuth, orderController.placeOrder);
router.get("/details/:orderId", userAuth, orderController.getOrderDetails);
router.get('/invoice/:orderId/:itemId',userAuth,orderController.getInvoice)



router.get("/history", userAuth, orderController.getOrderHistory);

router.post("/cancel/:orderId/:itemId", userAuth, orderController.cancelItem);
router.post("/return/:orderId/:itemId", userAuth, orderController.returnItem);
router.get('/repay/:orderId/:itemId',userAuth, orderController.repayItem);

router.get('/wallet',userAuth, walletController.showWallet);
router.post('/wallet/update',userAuth ,walletController.updateWallet);

router.post('/pay',orderController.placeOrder);
router.get('/success',paymentController.successPage)
router.get('/cancel',paymentController.cancelPage)
  
router.get('/orderAddress',userAuth,addressController.newAddress)


module.exports = router;
