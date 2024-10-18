const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");

// Initialize Razorpay instance with your credentials
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});



// Verify the payment after Razorpay callback
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    // Payment successful, update order status to 'Paid'
    await Order.findOneAndUpdate(
      { 'razorpayOrderId': razorpay_order_id },
      { status: 'Paid' }
    );
    res.redirect('/shop');
  } else {
    // Payment failed
    res.status(400).send('Payment verification failed');
  }
};


const createRazorpayOrder = async (req, res) => {
  const { orderId } = req.params;
  console.log("Razorpay route hit!", orderId);

  // Fetch the order using the orderId
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).send('Order not found');
  }

  // Proceed with Razorpay order creation as before
  const razorpayOrderOptions = {
    amount: order.totalOrderPrice * 100, // in paise
    currency: 'INR',
    receipt: `rcpt_${order.userId}_${Date.now()}`
  };

  try {
    const razorpayOrder = await razorpayInstance.orders.create(razorpayOrderOptions);
    console.log("Razorpay Order created:", razorpayOrder);

    res.json({
      orderId: razorpayOrder.id,
      currency: razorpayOrder.currency,
      amount: razorpayOrder.amount,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).send('Error creating Razorpay order');
  }
};


module.exports = { createRazorpayOrder, verifyPayment };
