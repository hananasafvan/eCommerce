const express = require("express");

const router = express.Router();
const {userAuth,adminAuth} = require('../middleweares/auth')
const orderController= require("../controllers/admin/orderController");


router.get("/orderList",orderController.getOrderList);
router.post('/order/update/:orderId/:itemId', orderController.updateOrderStatus);
router.get("/order/cancel/:id", orderController.cancelOrder);
router.get('/order/view/:id',adminAuth, orderController.viewOrder);



module.exports = router;
