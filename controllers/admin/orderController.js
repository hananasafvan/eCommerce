const Order = require("../../models/orderSchema");
const Product = require("../../models/productShema");
const User = require('../../models/userSchema')

const getOrderList = async (req, res) => {
  try {
    const perPage = 10;
    const page = parseInt(req.query.page) || 1;

    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate("userId", "name")
      .populate("items.productId", "name");

    const totalOrders = await Order.countDocuments();

    res.render("orderList", {
      orders,
      current: page,
      pages: Math.ceil(totalOrders / perPage),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};


const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log("Cancelling Order ID:", orderId);

    const order = await Order.findById(orderId);
    if (!order) {
      console.log("Order not found");
      return res.status(404).send("Order not found");
    }

    // Update order status to 'Cancelled'
    order.status = "Cancelled";
    await order.save();

    // Loop through each item in the order and update stock for the specific size
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const stockItem = product.stock.find(stock => stock.size === item.size);
        
        if (stockItem) {
          stockItem.quantity += item.quantity; // Increment stock for specific size
          await product.save();
        } else {
          console.log(`Size ${item.size} not found in product stock`);
        }
      } else {
        console.log(`Product ID ${item.productId} not found`);
      }
    }

    res.redirect("/admin/orderList");
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).send("Internal Server Error");
  }
};



const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const item = order.items.find((item) => item.itemId === itemId);
    if (!item) {
      return res.status(404).send("Item not found");
    }

    // Update item status
    item.status = status;

    if (status === "Returned") {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).send("Product not found");
      }

      const refundAmount = item.totalPrice;

      // Increase stock for the returned quantity in the specific size
      const stockItem = product.stock.find(stock => stock.size === item.size);
      console.log('update order stock item,',stockItem);
      
      if (stockItem) {
        stockItem.quantity += item.quantity;
      } else {
        return res.status(400).send("Size not found in product stock");
      }
      await product.save();

      // Update user wallet with the refund amount
      const user = await User.findById(order.userId);
      if (!user) {
        return res.status(404).send("User not found");
      }

      console.log('Refund amount for returned item:', refundAmount);

      user.walletBalance = (user.walletBalance || 0) + refundAmount;
      user.walletTransactions.push({
        amount: refundAmount,
        description: `Refund for returned item (Order ID: ${order._id})`,
      });
      await user.save();
    }

    await order.save();
    res.redirect("/admin/orderList");
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send("Internal Server Error");
  }
};



const viewOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    console.log("vieworder", orderId);

    const order = await Order.findById(orderId)
      .populate("userId", "name")
      .populate("items.productId", "productName productImage regularPrice")

      .exec();
    console.log("Fetched Order:", order);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("viewOrder", {
      order: order,
      pageTitle: "Order Details",
      path: "/admin/order/view",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error", error);
  }
};

module.exports = {
  getOrderList,
  updateOrderStatus,
  cancelOrder,
  viewOrder,
};
