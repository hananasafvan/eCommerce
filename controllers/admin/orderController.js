const Order = require("../../models/orderSchema");
const User = require('../../models/userSchema')

const getOrderList = async (req, res) => {
  const userId = req.session.user || req.user
  try {
    const perPage = 3;
    const page = parseInt(req.query.page) || 1;
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    const orders = await Order.find({})
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate("userId", "name")
      .populate("items.productId", "name");

    const totalOrders = await Order.countDocuments();

    res.render("orderList", {
      orders,
      user: userData,
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

const viewOrder = async (req, res) => {
  try {
      const orderId = req.params.id;
      const order = await Order.findById(orderId)
      .populate('userId','name')
          .populate( 'items.productId',  'productName')
          .exec(); 
          console.log("Fetched Order:", order);

      if (!order) {
          return res.status(404).send('Order not found');
      }

      res.render('viewOrder', {
          order: order,
          pageTitle: 'Order Details',
          path: '/admin/order/view'
      });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
  }
};

module.exports = {
  getOrderList,
  updateOrderStatus,
  cancelOrder,
  viewOrder,
};
