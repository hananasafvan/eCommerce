const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productShema");
const User = require('../../models/userSchema')



const getOrderPage = async (req, res) => {
  const userId = req.session.user || req.user;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const addressData = await Address.findOne({ userId });
    const userAddresses = addressData ? addressData.address : []; // Ensure this is an array
    console.log("Addresses: ", userAddresses);
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    res.render("order", { 
      user: userData,
      cartItems: cart.items, 
      userAddresses: userAddresses // Use userAddresses directly
    });
  } catch (error) {
    console.error("Error retrieving order page:", error);
    res.status(500).send("Internal server error");
  }
};


const placeOrder = async (req, res) => {
  const userId = req.session.user || req.user

  console.log('order',userId);
  
  const { selectedAddress, paymentMethod } = req.body; // Extract payment method from the request body

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    if (!cart || cart.items.length === 0) {
    return res.redirect("/cart",
      {user: userData,}
    );
    }

    // Create a new order with the selected payment method
    const newOrder = new Order({
      userId,
      items: cart.items,
      address: selectedAddress,
      paymentMethod, // Use the selected payment method from the form
      status: "Pending",
    });

    await newOrder.save();

    // Reduce product quantities in stock
    await Promise.all(cart.items.map(async (item) => {
      const product = await Product.findById(item.productId._id);
      product.quantity -= item.quantity;
      await product.save();
    }));

    // Clear the cart after placing the order
    await Cart.findByIdAndDelete(cart._id);
    console.log("Cart cleared");

    res.redirect("/order/checkout");
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Internal server error");
  }
};



// const getOrderHistory = async (req, res) => {
//   const userId = req.session.user || req.user
//   console.log("userId:",userId);
  

//   try {
//     const orders = await Order.find()
//     .populate('userId')
//     .populate('address')
//       .populate("items.productId")
     
//       .exec();

//       let userData = userId ? await User.findById(userId) : null;
//     res.locals.user = userData;

//     const formattedOrders = orders.map((order) => ({
//       ...order.toObject(),
//       createdAtFormatted: order.createdAt.toLocaleDateString("en-GB"),
//       totalOrderPrice: order.items.reduce(
//         (acc, item) => acc + item.totalPrice,
//         0
//       ),
//     }));

//     res.render("orderHistory", 
//       {   user: userData,
//          orders: formattedOrders 

//       });
//   } catch (error) {
//     console.error("Error retrieving order history:", error);
//     res.status(500).send("Internal server error");
//   }
// };




const getOrderHistory = async (req, res) => {
  const userId = req.session.user || req.user;
  
  if (!userId) {
    return res.redirect('/login');
  }

  try {
    const orders = await Order.find({ userId })  // Make sure to only get the user's orders
      .populate('userId')
      .populate({
        path: 'address', // Populates the 'address' field of the order
        model: 'Address'
      })
      .populate('items.productId') 
      .exec();


    // Fetching user data
    const userData = await User.findById(userId);
    res.locals.user = userData;

    // Formatting orders for display
    const formattedOrders = orders.map((order) => ({
      ...order.toObject(),
      createdAtFormatted: order.createdAt.toLocaleDateString('en-GB'),
      totalOrderPrice: order.items.reduce((acc, item) => acc + item.totalPrice, 0),
    }));

    res.render('orderHistory', {
      user: userData,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('Error retrieving order history:', error);
    res.status(500).send('Internal server error');
  }
};




const cancelOrder = async (req, res) => {
  const { orderId, productId } = req.params;
  const userId = req.session.user;

  try {
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    // Check if the order is still pending
    if (order.status !== 'Pending') {
      return res.status(400).send("Order cannot be modified.");
    }

    // Find the item to remove
    const itemIndex = order.items.findIndex(item => item.productId.equals(productId));

    if (itemIndex === -1) {
      return res.status(404).send("Product not found in the order.");
    }

    // Restore product quantity in the inventory
    const product = await Product.findById(order.items[itemIndex].productId);
    product.quantity += order.items[itemIndex].quantity;
    await product.save();

    // Remove the item from the order
    order.items.splice(itemIndex, 1);

    // If no more items remain, delete the order
    if (order.items.length === 0) {
      await Order.deleteOne({ _id: orderId });
    } else {
      // Recalculate total order price
      order.totalOrderPrice = order.items.reduce((acc, item) => acc + item.totalPrice, 0);
      await order.save();
    }

    res.redirect("/order/history");
  } catch (error) {
    console.error("Error canceling item from order:", error);
    res.status(500).send("Internal server error");
  }
};

const cancelOrderItem = async (req, res) => {
  const { orderId, productId } = req.params;
  const userId = req.session.user;

  try {
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Pending") {
      return res.status(400).json({ error: "Order cannot be canceled." });
    }

    const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in the order." });
    }

    // Restore product quantity
    const product = await Product.findById(productId);
    product.quantity += order.items[itemIndex].quantity;
    await product.save();

    // Remove the item from the order
    order.items.splice(itemIndex, 1);

    // If no items left in the order, delete the order, otherwise save it
    if (order.items.length === 0) {
      await Order.deleteOne({ _id: orderId });
    } else {
      await order.save();
    }

    res.status(200).json({ message: "Item canceled successfully." });
  } catch (error) {
    console.error("Error canceling order item:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getOrderDetails = async (req, res) => {
  try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId)
      .populate('items.productId'); // Populate product details
       
      if (!order) {
          return res.status(404).send('Order not found');
      }

      // Format the createdAt date (if needed)
      order.createdAtFormatted = order.createdAt.toLocaleDateString(); // Customize date format as needed

      res.render('orderdetails', { order });
  } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
  }
};

module.exports = {
  getOrderPage,
  placeOrder,
  getOrderHistory,
  cancelOrder,
  cancelOrderItem,
  getOrderDetails,
};
