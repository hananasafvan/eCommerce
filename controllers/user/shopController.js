const Product = require('../../models/productShema');

const getShop = async (req, res) => {
  try {
    const { search, sort } = req.query;

    // Search Filter
    const query = {};
    if (search) {
      query.productName = { $regex: search, $options: "i" };
    }

    // Sorting Logic
    let sortOption = {};
    switch (sort) {
      case "popularity":
        sortOption.popularity = -1; // Descending
        break;
      case "priceLowToHigh":
        sortOption.regularPrice = 1; // Ascending
        break;
      case "priceHighToLow":
        sortOption.regularPrice = -1; // Descending
        break;
      case "averageRatings":
        sortOption.rating = -1; // Descending
        break;
      case "featured":
        query.isFeatured = true; // Only show featured products
        break;
      case "newArrivals":
        sortOption.createdAt = -1; // Newest first
        break;
      case "aToZ":
        sortOption.productName = 1; // Ascending alphabetical
        break;
      case "zToA":
        sortOption.productName = -1; // Descending alphabetical
        break;
      default:
        sortOption = {}; // Default sorting (no sorting applied)
        break;
    }

    // Retrieve Products
    const products = await Product.find(query).sort(sortOption);

    res.render("shop", { products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getShop,
};
