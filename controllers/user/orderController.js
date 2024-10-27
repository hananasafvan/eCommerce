const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productShema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
//const Wallet = require('../../models/wishlistSchema')
const env = require("dotenv").config();


const getOrderPage = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart"); // Redirect to cart if it's empty
    }

    // Proceed with the order placement logic
    const user = await User.findById(userId);
    const addressData = await Address.find({ userId });
    const couponData = await Coupon.find({
      status: "Active",
      usageLimit: { $gt: 0 },
      redeemedUsers: { $nin: [userId] },
    });

    const totalOrderPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);

    res.render("order", {
      cartItems: cart.items,
      totalOrderPrice,
      addressData,
      couponData,
      user,
      orderId: null, // Placeholder for order ID, generate this as per your logic
      razorpayKey: process.env.RAZORPAY_KEY_ID,
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
  const { selectedAddress, paymentMethod, coupon } = req.body;
  console.log("User ID:", userId);
console.log("Selected Address:", selectedAddress);
console.log("Payment Method:", paymentMethod);
//console.log("Total Order Price:", totalOrderPrice);


  try {
    if (!mongoose.Types.ObjectId.isValid(selectedAddress)) {
      throw new Error("Invalid address ID");
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const address = await Address.findById(selectedAddress);
    let totalOrderPrice = cart.items.reduce((total, item) => total + (item.totalPrice || 0), 0);
    console.log('1 total o price',totalOrderPrice);
    

    const couponData = coupon ? await Coupon.findOne({ _id: coupon, status: "Active",usageLimit:{$gt:0} }) : null;

    if (couponData) {
      

      if (couponData.minPurchase && couponData.minPurchase > totalOrderPrice) {
        return res.status(400).render('couponerror')
      }
//.send(`Minimum purchase of ₹${couponData.minPurchase} is required to apply this coupon.`);
      

      const discountValue = couponData.discountValue;
      if (couponData.discountType === "percentage") {
        totalOrderPrice -= totalOrderPrice * (discountValue / 100);
      } else {
        totalOrderPrice -= discountValue;
      }

      if (!couponData.redeemedUsers.includes(userId)) {
        couponData.redeemedUsers.push(userId);
        couponData.count += 1; // Track the number of redemptions
        couponData.usageLimit -=1;
        await couponData.save();
      }
    }

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
      status: paymentMethod === "Cash on Delivery" ? "Pending" : "Pending Payment",
      totalOrderPrice,
      coupon: coupon || null,
    });
console.log('total order price',totalOrderPrice);

    await newOrder.save();
    await Cart.findByIdAndDelete(cart._id);

    if (paymentMethod === "Cash on Delivery") {
      return res.render("confirm-cod");
    } else if (paymentMethod === "Wallet") {
      const user = await User.findById(userId);
      if (totalOrderPrice <= user.walletBalance) {
        user.walletBalance -= totalOrderPrice;
        await user.save();
        return res.render("wallet-pay");
      }
    } else if (paymentMethod === "Online Payment") {
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
    
    console.log("Order Status:", order.status);
    console.log("Item Status:", item.status);

    if (order.status === "Pending Confirmation" && item.status !== "Cancelled") {
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
        user.walletTransactions.push({
          amount: item.price,
          description: "Item return processed",
        });
        await user.save();
      }

console.log(User);

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
