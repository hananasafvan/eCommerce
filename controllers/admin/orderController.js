const Order = require("../../models/orderSchema");
const Product = require("../../models/productShema");

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

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    const productId = req.params;
    console.log("get product id", productId);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const itemIndex = order.items.findIndex((item) => item.itemId === itemId);
    if (itemIndex === -1) {
      return res.status(404).send("Item not found");
    }

    order.items[itemIndex].status = status;

    if (status === "Returned") {
      const productId = order.items[itemIndex].productId;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).send("Product not found");
      }

      const qua = order.items[itemIndex].quantity;

      product.quantity += qua;
      await product.save();
    }

    if (status === "Cancelled") {
      const productId = order.items[itemIndex].productId;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).send("Product not found");
      }
      const qua = order.items[itemIndex].quantity;
      console.log("quantity", qua);

      product.quantity += qua;
      await product.save();
    }

    await order.save();

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
