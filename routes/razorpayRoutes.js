const express = require('express');
const router = express.Router();
const razorpayController = require('../controllers/user/razorpayController'); 
const env = require("dotenv").config();

router.post('/create-order', razorpayController.createOrder);

module.exports = router;
