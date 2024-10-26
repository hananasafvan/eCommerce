const Cart = require("../../models/cartSchema");
const Product = require("../../models/productShema");

const User = require("../../models/userSchema");
const Wishlist = require("../../models/wishlistSchema");

const addToCart = async (req, res) => {
  try {
    
    const userId = req.session.user || req.user;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  console.log("Authenticated User ID:", userId);

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

    if (cart.items.length >= 10) {
      cart.items.shift();
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId == productId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += 1;
      cart.items[itemIndex].totalPrice += product.salePrice;
    } else {
      cart.items.push({
        userId,
        productId,
        quantity: 1,
        price: product.salePrice,
        totalPrice: product.salePrice,
      });
    }

    product.quantity -= 1;
    await product.save();
console.log('cart product',product);

    await cart.save();
    res.json({ message: "Product added to cart" });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addToCartWish = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    console.log("cart whishlist ", userId);

    const { productId } = req.body;
    console.log("wish product id", productId);

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

    const itemIndex = cart.items.findIndex(
      (item) => item.productId == productId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += 1;
      cart.items[itemIndex].totalPrice += product.salePrice;
    } else {
      cart.items.push({
        userId,
        productId,
        quantity: 1,
        price: product.salePrice,
        totalPrice: product.salePrice,
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

// const getCart = async (req, res) => {
//   const userId = req.session.user || req.user;
//   console.log("cart userid", userId);

//   try {
//     const cart = await Cart.findOne({ userId }).populate("items.productId");

//     let userData = userId ? await User.findById(userId) : null;
//     res.locals.user = userData;

//     if (!cart || cart.items.length === 0) {
//       return res.render("cart.ejs", { cartItems: [] });
//     }

//     res.render("cart.ejs", {
//       user: userData,
//       cartItems: cart.items,
//     });
//   } catch (error) {
//     console.error("Error retrieving cart:", error);
//     res.status(500).send("Internal server error");
//   }
// };

const getCart = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.redirect('/login');  // Redirect if user is not logged in
    }

    console.log("cart userid", userId);

    // Fetch the cart and populate product details
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    console.log('get cart', cart);
    
    // Fetch user data
    const userData = await User.findById(userId);
    res.locals.user = userData;
    console.log('get cart', userData);
    // Check if the cart exists and has items
    if (!cart || cart.items.length === 0) {
      return res.render("cart.ejs", { user: userData, cartItems: [] });
    }

    // Render the cart with the cart items and user data
    res.render("cart.ejs", {
      user: userData,
      cartItems: cart.items,
    });
    
  } catch (error) {
    console.error("Error retrieving cart:", error.stack);
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
      const productQuantityInCart = cart.items[itemIndex].quantity;

      cart.items.splice(itemIndex, 1);
      await cart.save();

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $inc: { quantity: productQuantityInCart } },
        { new: true }
      );

      if (
        updatedProduct.quantity > 0 &&
        updatedProduct.status === "out of stock"
      ) {
        updatedProduct.status = "Available";
        await updatedProduct.save();
      }

      const user = await User.findById(userId);
      res.locals.user = user;

      return res.json({
        message: "Product removed and stock updated",
        productQuantity: updatedProduct.quantity,
      });
    } else {
      return res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (error) {
    console.error("Error removing product from cart:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const MAX_QUANTITY_PER_PRODUCT = 5;

const updateQuantity = async (req, res, next) => {
  const { productId, change } = req.body;
  const userId = req.session.user || req.user;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = cart.items.find(
      (item) => item.productId._id.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    if (item.isBlocked) {
      return res.status(400).json({ error: "Product is blocked" });
    }

    let newQuantity = item.quantity + change;

    if (newQuantity < 1) {
      newQuantity = 1;
      return res
        .status(400)
        .json({
          error:
            "Minimum quantity is 1. If you want to remove the item, use the remove button.",
        });
    }

    if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
      return res
        .status(400)
        .json({
          error: `You can only have up to ${MAX_QUANTITY_PER_PRODUCT} units of this product`,
        });
    }

    if (change > 0 && item.productId.quantity < change) {
      return res.status(400).json({ error: "Not enough stock available" });
    }

    const quantityDifference = change;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $inc: { quantity: -quantityDifference },
      },
      { new: true }
    );

    if (updatedProduct.quantity === 0) {
      updatedProduct.status = "out of stock";
    } else {
      updatedProduct.status = "Available";
    }

    await updatedProduct.save();

    item.quantity = newQuantity;
    item.totalPrice = item.price * newQuantity;
    await cart.save();

    const user = await User.findById(userId);
    res.locals.user = user;

    res.json({
      success: true,
      updatedQuantity: item.quantity,
      productStatus: updatedProduct.status,
      productQuantity: updatedProduct.quantity,
    });
  } catch (error) {
    next(error);
  }
};

const addToWishlist = async (req, res) => {
  const userId = req.session.user || req.user;
  const productId = req.body.productId;

  try {
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const productExists = wishlist.products.some(
      (item) => item.productId.toString() === productId
    );

    if (productExists) {
      return res
        .status(200)
        .json({ message: "Product is already in your wishlist!" });
    }

    wishlist.products.push({ productId });
    await wishlist.save();

    return res.status(200).json({ message: "Product added to wishlist!" });
  } catch (error) {
    console.error("Error adding to wishlist:", error.message, error.stack);
    if (!res.headersSent) {
      return res.status(500).send("Internal server error");
    }
  }
};

const getWishlist = async (req, res) => {
  const userId = req.session.user || req.user;
  console.log("cart userid", userId);

  try {
    const wishlist = await Wishlist.findOne({ userId }).populate(
      "products.productId"
    );

    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;

    if (!wishlist || wishlist.products.length === 0) {
      return res.render("wishlist", { user: userData, wishlistItems: [] });
    }
    console.log("Wishlist products:", wishlist.products);

    return res.render("wishlist", {
      user: userData,
      wishlistItems: wishlist.products,
    });
  } catch (error) {
    console.error("Error retrieving cart:", error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    console.log("Wishlist found:", wishlist);
    console.log("Wishlist products:", wishlist.products);

    if (!wishlist.products || wishlist.products.length === 0) {
      return res.status(404).json({ message: "No products in wishlist" });
    }

    wishlist.products = wishlist.products.filter(
      (item) => item.productId.toString() !== productId
    );

    console.log("Updated Wishlist products:", wishlist.products);

    await wishlist.save();

    return res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addToCart,
  addToCartWish,
  getCart,
  removeFromCart,
  updateQuantity,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
};
