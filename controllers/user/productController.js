const Product = require("../../models/productShema");
const User = require("../../models/userSchema");


// Get all products to list on Home and Shop pages
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({quantity:{$gt:0}});
    const user = req.session.user || null;
    res.render("shop", { products,user }); // Render the shop page with products data
  
  
  
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server Error");
  }
};

// Get product details by ID
const getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId); // Fetch a specific product by its ID
    const user = req.session.user || null;  
    if (!product) {
      return res.status(404).send("Product not found");
    }

if(product.isBlocked){
  req.session.destroy((err) => {
    if (err) {
      console.log("Session destruction error:", err);
      return res.status(500).send("Internal server error");
    }
    return res.render('productDetails',{
      message:'admin has blocked this product',
      product:null
    })
  });
  
}

else{
  res.render("productDetails", { product,user })
}

} catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).send("Server Error");
  }
};

const getForgotpassword =async(req,res)=>{
  try {
    res.render('forgotPassword')
  } catch (error) {
    res.redirect('/pageNotFound')
  }
}


module.exports = {
  getProducts,
  getProductDetails,
  getForgotpassword
  
};
