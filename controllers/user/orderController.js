const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productShema");

const getOrderPage = async (req, res) => {
  const userId = req.session.user;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const addressData = await Address.findOne({ userId });
    const userAddresses = addressData ? addressData.address : [];
    console.log("Addresses: ", userAddresses);
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    res.render("order", { cartItems: cart.items, userAddresses });
  } catch (error) {
    console.error("Error retrieving order page:", error);
    res.status(500).send("Internal server error");
  }
};

const placeOrder = async (req, res) => {
  const userId = req.session.user;
  const { selectedAddress } = req.body;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const newOrder = new Order({
      userId,
      items: cart.items,
      address: selectedAddress,
      paymentMethod: "Cash on Delivery",
      status: "Pending",
    });

    await newOrder.save();

    // Reduce product quantities in stock
    cart.items.forEach(async (item) => {
      const product = await Product.findById(item.productId._id);
      product.quantity -= item.quantity;
      await product.save();
    });

    // Clear the cart after placing the order
    await Cart.findByIdAndDelete(cart._id);
    console.log("clear cart");

    res.redirect("/order/checkout");
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Internal server error");
  }
};



const getOrderHistory = async (req, res) => {
  const userId = req.session.user;

  try {
    const orders = await Order.find({ userId })
      .populate("items.productId") // Fetch product details
      .exec();

    const formattedOrders = orders.map(order => ({
      ...order.toObject(),
      createdAtFormatted: order.createdAt.toLocaleDateString("en-GB"), // Format date as DD/MM/YYYY
      totalOrderPrice: order.items.reduce((acc, item) => acc + item.totalPrice, 0) // Precompute total price
    }));

    res.render("orderHistory", { orders: formattedOrders });
  } catch (error) {
    console.error("Error retrieving order history:", error);
    res.status(500).send("Internal server error");
  }
};



const cancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.session.user;

  try {
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    // Optional: Check if the order can be canceled (e.g., only if it's pending)
    if (order.status !== "Pending") {
      return res.status(400).send("Order cannot be canceled.");
    }

    // Delete the order from the database
    await Order.deleteOne({ _id: orderId });

    // Restore product quantities
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      product.quantity += item.quantity; // Restore quantity
      await product.save();
    }

    res.redirect("/order/history"); // Redirect to order history page
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).send("Internal server error");
  }
};


module.exports = {
  getOrderPage,
  placeOrder,
  getOrderHistory,
  cancelOrder,
};
