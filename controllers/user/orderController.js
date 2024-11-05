const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productShema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const env = require("dotenv").config();
const paypal = require("paypal-rest-sdk");
paypal.configure({
  mode: process.env.PAYPAL_MODE, // sandbox or live
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.SECRET_ID,
});

const getOrderPage = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const user = await User.findById(userId);
    const addressData = await Address.find({ userId });
    const couponData = await Coupon.find({
      status: "active",
      usageLimit: { $gt: 0 },
      redeemedUsers: { $nin: [userId] },
    });

    const totalOrderPrice = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    res.render("order", {
      cartItems: cart.items,
      totalOrderPrice,
      addressData,
      couponData,
      user,
      orderId: null,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error rendering order page:", error);
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

const getOrderHistory = async (req, res) => {
  const userId = req.session.user || req.user;

  if (!userId) {
    return res.redirect("/login");
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;

  try {
    const totalOrders = await Order.countDocuments({ userId });

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    console.error("Error retrieving order history:", error);
    res.status(500).send("Internal server error");
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    const { selectedAddress, paymentMethod, coupon } = req.body;

    if (!mongoose.Types.ObjectId.isValid(selectedAddress)) {
      throw new Error("Invalid address ID");
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const address = await Address.findById(selectedAddress);
    console.log("cart item length ", cart.items.length);
    const totalQuantity = cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    console.log("total item length", totalQuantity);

    let totalOrderPrice = cart.items.reduce((total, item) => {
      const product = item.productId;
      const effectivePrice = product.salePrice || product.regularPrice;

      const discountMultiplier = (100 - (product.productOffer || 0)) / 100;
      const itemPrice = effectivePrice * discountMultiplier;

      item.totalPrice = itemPrice * item.quantity;

      return total + item.totalPrice;
    }, 0);

    const couponData = coupon
      ? await Coupon.findOne({
          _id: coupon,
          status: "active",
          usageLimit: { $gt: 0 },
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        })
      : null;
    if (couponData) {
      if (couponData.minPurchase && couponData.minPurchase > totalOrderPrice) {
        return res
          .status(400)
          .send(
            `Minimum purchase of ₹${couponData.minPurchase} is required to apply this coupon.`
          );
      }
      const discountValue = couponData.discountValue;
      if (couponData.discountType === "percentage") {
        totalOrderPrice -= totalOrderPrice * (discountValue / 100);
      } else {
        let coupenPerUnit = (discountValue / totalQuantity).toFixed(3);
        console.log("coupen per unit", coupenPerUnit);
        cart.items.forEach((item) => {
          const quantity = item.quantity;
          const price = item.price;
          let totalprice = item.totalPrice;
          console.log("`Quantity:", quantity);
          console.log("`Price per Unit: ", price);
          const discountForItem = coupenPerUnit * quantity;
          item.totalPrice = totalprice - discountForItem;
        });

        totalOrderPrice = cart.items.reduce(
          (total, item) => total + item.totalPrice,
          0
        );
      }

      if (!couponData.redeemedUsers.includes(userId)) {
        couponData.redeemedUsers.push(userId);
        couponData.usageLimit -= 1;
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
      orderStatus: "Pending",
      totalOrderPrice,
      coupon: coupon || null,
    });

    await newOrder.save();

    await Cart.findByIdAndDelete(cart._id);

    if (paymentMethod === "Cash on Delivery") {
      newOrder.items.forEach((item) => (item.status = "Processing"));
      newOrder.orderStatus = "Processing";
      await newOrder.save();

      return res.render("confirm-cod");
    } else if (paymentMethod === "Wallet") {
      const user = await User.findById(userId);
      if (totalOrderPrice <= user.walletBalance) {
        user.walletBalance -= totalOrderPrice;
        user.walletTransactions.push({
          amount: -totalOrderPrice,
          description: `Order placed with Wallet Payment (Order ID: ${newOrder._id})`,
        });
        await user.save();

        newOrder.items.forEach((item) => (item.status = "Paid"));
        newOrder.orderStatus = "Processing";
        await newOrder.save();

        return res.render("confirm-cod");
      } else {
        return res.status(400).send("Insufficient Wallet Balance.");
      }
    } else if (paymentMethod === "Online Payment") {
      const items = cart.items.map((item) => ({
        name: item.productId.productName,
        sku: item.productId._id,
        price: (item.totalPrice / 84.1).toFixed(2),
        currency: "USD",
        quantity: item.quantity,
      }));

      const totalAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
      );

      const create_payment_json = {
        intent: "sale",
        payer: { payment_method: "paypal" },
        redirect_urls: {
          return_url: `http://localhost:3000/order/success?orderId=${newOrder._id}`,
          cancel_url: "http://localhost:3000/order/cancel",
        },
        transactions: [
          {
            item_list: { items },
            amount: {
              currency: "USD",
              total: totalAmount.toFixed(2),
            },
            description: "Thank you for your purchase!",
          },
        ],
      };

      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          console.error("PayPal Payment Error:", error);
          throw error;
        } else {
          for (let i = 0; i < payment.links.length; i++) {
            if (payment.links[i].rel === "approval_url") {
              return res.redirect(payment.links[i].href);
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).send("Internal server error");
  }
};

const cancelItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    console.log("cancelitem", orderId);

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

    if (
      order.orderStatus === "Processing" &&
      item.status !== "Cancelled" &&
      item.status !== "Returned"
    ) {
      item.status =
        order.paymentMethod === "Online Payment" ||
        order.paymentMethod === "Wallet"
          ? "Returned"
          : "Cancelled";
      await order.save();

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      product.quantity += item.quantity;
      await product.save();

      // order.totalOrderPrice -= item.totalPrice;
      // await order.save();

      if (
        order.paymentMethod === "Online Payment" ||
        order.paymentMethod === "Wallet"
      ) {
        const user = await User.findById(order.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        user.walletBalance += item.totalPrice;
        user.walletTransactions.push({
          amount: item.totalPrice,
          description: `Refund for cancelled item (Order ID: ${orderId}, Item ID: ${itemId})`,
        });

        await user.save();

        return res.status(200).json({
          message: "Item cancelled successfully",
        });
      }

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
      const refundAmount = item.totalPrice * item.quantity;
      console.log("return amount ", returnItem);

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (item.status === "Returned") {
        const user = await User.findById(order.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        user.walletBalance += refundAmount;
        user.walletTransactions.push({
          amount: refundAmount,
          description: "Item return processed",
        });
        await user.save();
      }

      console.log(User);

      return res.status(200).json({
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
