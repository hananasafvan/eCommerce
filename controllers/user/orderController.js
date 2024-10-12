const mongoose = require('mongoose')
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productShema");
const User = require("../../models/userSchema");

const getOrderPage = async (req, res) => {
  const userId = req.session.user || req.user;

  try {
    let userData = userId
      ? await User.findById(userId).populate("address")
      : null;
    res.locals.user = userData;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const addressData = userData.address;
    const userAddresses = []; 
    console.log("Addresses: ", addressData);
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    res.render("order", {
      user: userData,
      cartItems: cart.items,
      addressData: addressData,
      userAddresses: userAddresses, 
    });
  } catch (error) {
    console.error("Error retrieving order page:", error);
    res.status(500).send("Internal server error");
  }
};

const placeOrder = async (req, res) => {
  const userId = req.session.user || req.user;

  console.log("order", userId);

  const { selectedAddress, paymentMethod } = req.body; 
  

  try {
    if (!mongoose.Types.ObjectId.isValid(selectedAddress)) {
      throw new Error('Invalid address ID');
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const address = await Address.findById(selectedAddress);
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart", { user: userData });
    }

    

    //const totalOrderPrice = cart.items.reduce((total,item)=> {return total+item.totalPrice},0)
    
    const totalOrderPrice = cart.items.reduce((total, item) => {
      
      return total + (item.totalPrice || 0);  
    }, 0);
    

  console.log('totalOrderPrice',totalOrderPrice);
  
    const newOrder = new Order({
      userId,
      items: cart.items,
      address: {
        name: address.name,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
        altphone: address.altphone
      },
      paymentMethod,
      status: "Processing",
      totalOrderPrice,
      
    });

    await newOrder.save();

    // Clear the cart after placing the order
    await Cart.findByIdAndDelete(cart._id);
    console.log("Cart cleared");

    res.redirect("/order/checkout");
  
  } catch (error) {
    console.error("Error placing order:", error);
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
    
       .sort({createdAt:-1})
      .populate("userId")
      .populate({
        path: "address", 
        model: "Address",
      })
      // .populate({
      //   path: "items.productId",
      //   model: "Product",

      //   select: "name price",
      // })
.populate('items.productId')
      .exec();
    console.log("my orders", orders);

    // Fetching user data
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


    res.render("orderdetails", { order,
      user:userData
     });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
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
      order.totalOrderPrice -=item.totalPrice
      await order.save()

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Increase product quantity by the quantity of the canceled item
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
const returnItem = async (req,res) =>{
  try {
    const {orderId,itemId} = req.params
    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId)
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    if(item.status === 'Delivered' ){
      item.status = 'Request to return'
      await order.save()

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

    
 return res.status(200).json({message:'item return requested successfully'})
    }else{

      return res.status(400).json({ message: "Item cannot be returned" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getOrderPage,
  placeOrder,
  getOrderHistory,
  getOrderDetails,
  cancelItem,
  returnItem,
};
