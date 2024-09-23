const Order = require("../../models/orderSchema");

const getOrderList = async (req, res) => {
  try {
    const perPage = 3;
    const page = parseInt(req.query.page) || 1;

    const orders = await Order.find({})
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

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;

    await Order.findByIdAndUpdate(orderId, { status: newStatus });
    res.redirect("/admin/orderList");
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send("Internal Server Error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log("Cancelling Order ID:", orderId);
    const updatedOrder = await Order.findByIdAndUpdate(orderId, {
      status: "Cancelled",
    });

    if (!updatedOrder) {
      console.log("Order not found");
      return res.status(404).send("Order not found");
    }

    res.redirect("/admin/orderList");
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getOrderList,
  updateOrderStatus,
  cancelOrder,
};
