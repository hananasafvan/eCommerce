const Cart = require("../../models/cartSchema");
const Product = require("../../models/productShema");
const session = require('express-session')

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user; // Make sure session.user contains the ID
    const { productId } = req.body;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.quantity <= 0) {
        return res.status(400).json({ message: "Product out of stock" });
      }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if cart has 10 items
    if (cart.items.length >= 10) {
        // Remove the oldest item (first item in the array)
        cart.items.shift(); // Removes the first item
      }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId == productId
    );

    if (itemIndex > -1) {
      // If product exists in cart, increase quantity
      cart.items[itemIndex].quantity += 1;
      cart.items[itemIndex].totalPrice += product.regularPrice;
    } else {
      // If product doesn't exist, add it to the cart
      cart.items.push({
        productId,
        quantity: 1,
        price: product.regularPrice,
        totalPrice: product.regularPrice,
      });
    }

    product.quantity -= 1;
    await product.save();

    await cart.save();
    res.json({ message: "Product added to cart" });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCart = async (req, res) => {
  const userId = req.session.user;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.render("cart.ejs", { cartItems: [] });
    }

    res.render("cart.ejs", { cartItems: cart.items });
  } catch (error) {
    console.error("Error retrieving cart:", error);
    res.status(500).send("Internal server error");
  }
};



const removeFromCart = async (req, res) => {
  const userId = req.session.user;
  const productId = req.params.productId;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId == productId
    );

    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1); // Remove the product from the cart
      await cart.save();
      return res.json({ message: "Product removed" }); // Send a JSON response

      
    } else {
      return res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (error) {
    console.error("Error removing product from cart:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



module.exports = {
  addToCart,
  getCart,
  removeFromCart,
};
