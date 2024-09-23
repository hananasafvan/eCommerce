const express = require("express");
const router = express.Router();
const {
  getOrderList,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/admin/orderController");

router.get("/orderList", getOrderList);

router.post("/order/update/:id", updateOrderStatus);

router.get("/order/cancel/:id", cancelOrder);

module.exports = router;
