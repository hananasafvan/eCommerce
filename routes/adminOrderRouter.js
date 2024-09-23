const express = require('express');
const router = express.Router();
const { getOrderList, updateOrderStatus, cancelOrder } = require('../controllers/admin/orderController'); // Importing order controller


router.get('/orderList', getOrderList);

// Route to change order status (POST request for form submission)
router.post('/order/update/:id', updateOrderStatus);

// Route to cancel an order
router.get('/order/cancel/:id', cancelOrder);

module.exports = router;
