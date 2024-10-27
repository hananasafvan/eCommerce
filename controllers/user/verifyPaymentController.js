const crypto = require('crypto');
const Order = require('../../models/orderSchema'); 


const verifyPayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature === razorpay_signature) {
    // Signature matches, create the order in the database
    const order = new Order({
      userId: req.session.user._id,
      items: req.session.cart.items,
      address: req.session.cart.address,
      paymentMethod: "Online Payment",
      status: "Paid",
      totalOrderPrice: req.session.cart.totalPrice,
    });
    await order.save();
    res.json({ success: true });
  } else {
    // Signature doesn't match
    res.json({ success: false });
  }
};

module.exports = verifyPayment;
