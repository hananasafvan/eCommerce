const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema'); 
const env = require("dotenv").config();
const {RAZORPAY_KEY_ID,RAZORPAY_SECRET_KEY} = process.env

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_SECRET_KEY,
});

const createOrder = async (req, res) => {
  const userId = req.session.user || req.user;
  const orderData = req.body;
  const totalAmount = orderData.totalAmount;

  try {
    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_order_${Math.random()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      console.log("Razorpay order creation failed");
      return res.status(500).send("Failed to create order in Razorpay");
    }

    console.log("Razorpay order created:", order); // Debugging output

    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).send("Internal server error");
  }
};



module.exports = {
  createOrder,
}