const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productShema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
//const Wallet = require('../../models/wishlistSchema')
const env = require("dotenv").config();
const {
  createOrder,
} = require("../../controllers/user/razorpayController");


const getOrderPage = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const addressData = await Address.find({ userId });
    const couponData = await Coupon.find();

    const order = await Order.findOne({ userId, status: "Processing" });
    if (!order) {
      return res.redirect("/cart");
    }

    const orderId = order._id;
    const totalOrderPrice = cart.items.reduce((total, item) => {
      return total + (item.totalPrice || 0);
    }, 0);

    res.render("order", {
      cartItems: cart.items,
      totalOrderPrice,
      addressData,
      couponData,
      user,
      orderId,
      razorpayKey: process.env.RAZORPAY_KEY_ID ,
    });
  } catch (error) {
    console.error("Error rendering order page:", error);
    res.status(500).send("Internal server error");
  }
};

const getOrderHistory = async (req, res) => {
  const userId = req.session.user || req.user;

  if (!userId) {
    return res.redirect("/login");
  }

  try {
    const orders = await Order.find({ userId })

      .sort({ createdAt: -1 })
      .populate("userId")
      .populate({
        path: "address",
        model: "Address",
      })

      .populate("items.productId")
      .exec();

    const userData = await User.findById(userId);
    res.locals.user = userData;

    res.render("orderHistory", {
      user: userData,
      orders,
    });
  } catch (error) {
    console.error("Error retrieving order history:", error);
    res.status(500).send("Internal server error");
  }
};

const getOrderDetails = async (req, res) => {
  const userId = req.session.user || req.user;
  try {
    const orderId = req.params.orderId;
    console.log("getorderdetails", orderId);

    const order = await Order.findById(orderId)
      .populate("items.productId")
      .populate({
        path: "address",
        model: "Address",
      });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    order.createdAtFormatted = order.createdAt.toLocaleDateString();
    const userData = await User.findById(userId);
    res.locals.user = userData;

    res.render("orderdetails", { order, user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

const placeOrder = async (req, res) => {
  const userId = req.session.user || req.user;

  console.log("placeOrder userId", userId);

  const selectedAddress = req.body.selectedAddress;
  const paymentMethod = req.body.paymentMethod;
  const coupon = req.body.coupon;

  console.log("Selected Address:", selectedAddress);
  console.log("Payment Method:", paymentMethod);
  console.log("Coupon ID:", coupon);

  try {
    if (!mongoose.Types.ObjectId.isValid(selectedAddress)) {
      throw new Error("Invalid address ID");
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      console.log("Cart is empty. Redirecting to cart...");
      return res.redirect("/cart");
    }

    const address = await Address.findById(selectedAddress);
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;

    let totalOrderPrice = cart.items.reduce(
      (total, item) => total + (item.totalPrice || 0),
      0
    );
    console.log("Total Order Price before discount:", totalOrderPrice);

    const couponData = coupon
      ? await Coupon.findOne({ _id: coupon, status: "Active" })
      : null;
    if (couponData) {
      const discountValue = couponData.discountValue;
      console.log("Discount Value:", discountValue);

      if (couponData.discountType === "percentage") {
        totalOrderPrice -= totalOrderPrice * (discountValue / 100);
      } else {
        totalOrderPrice -= discountValue;
      }
    }

    console.log("Final total price after coupon:", totalOrderPrice);

    const newOrder = new Order({
      userId,
      items: cart.items,
      address: {
        name: address.name,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
        altphone: address.altphone,
      },
      paymentMethod,
      status:
        paymentMethod === "Cash on Delivery"
          ? "Pending Confirmation"
          : "Pending Payment",
      totalOrderPrice,
      coupon: coupon === "" ? null : coupon,
    });

    await newOrder.save();
    console.log("New order saved:", newOrder);

    // Clear the cart
    await Cart.findByIdAndDelete(cart._id);
    console.log("Cart cleared");

    if (paymentMethod === "Cash on Delivery") {
      return res.render("confirm-cod");
    } else if (paymentMethod === "Wallet") {
      const user = await User.findById(userId);
      let walletBalance = user.walletBalance;
      console.log("wallet balence", walletBalance);

      if (totalOrderPrice <= walletBalance) {
        user.walletBalance -= totalOrderPrice;
        await user.save();
        return res.render("wallet-pay");
      } 
    }else if (paymentMethod === "Online Payment") {
      return res.json({ orderId: newOrder._id, totalAmount: totalOrderPrice });
    }
  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).send("Internal server error");
  }
};

const cancelItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (order.status === "Processing" && item.status !== "Cancelled") {
      item.status = "Cancelled";
      
      await order.save();

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      product.quantity += item.quantity;
      await product.save();
      await order.save();

      return res.status(200).json({ message: "Item cancelled successfully" });
    } else {
      return res.status(400).json({ message: "Item cannot be cancelled" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const returnItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    if (item.status === "Delivered") {
      item.status = "Request to return";
      await order.save();

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (item.status === "Returned") {
        const user = await User.findById(order.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        user.walletBalance += item.price;
        await user.save();
      }

      return res
        .status(200)
        .json({
          message: "Item return requested successfully, wallet updated",
        });
    } else {
      return res.status(400).json({ message: "Item cannot be returned" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getOrderPage,
  placeOrder,
  getOrderHistory,
  getOrderDetails,
  cancelItem,
  returnItem,
};
