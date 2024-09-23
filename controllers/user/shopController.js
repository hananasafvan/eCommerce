const Product = require('../../models/productShema');

// const getShop = async (req, res) => {
//   try {
//     const { search, sort } = req.query;

//     // Search Filter
//     const query = {};
//     if (search) {
//       query.productName = { $regex: search, $options: "i" };
//     }

//     // Sorting Logic
//     let sortOption = {};
//     switch (sort) {
//       case "popularity":
//         sortOption.popularity = -1; // Descending
//         break;
//       case "priceLowToHigh":
//         sortOption.regularPrice = 1; // Ascending
//         break;
//       case "priceHighToLow":
//         sortOption.regularPrice = -1; // Descending
//         break;
//       case "averageRatings":
//         sortOption.rating = -1; // Descending
//         break;
//       case "featured":
//         query.isFeatured = true; // Only show featured products
//         break;
//       case "newArrivals":
//         sortOption.createdAt = -1; // Newest first
//         break;
//       case "aToZ":
//         sortOption.productName = 1; // Ascending alphabetical
//         break;
//       case "zToA":
//         sortOption.productName = -1; // Descending alphabetical
//         break;
//       default:
//         sortOption = {}; // Default sorting (no sorting applied)
//         break;
//     }

//     // Retrieve Products
//     const products = await Product.find(query).sort(sortOption);

//     res.render("shop", { products });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Server Error");
//   }
// };
const getShop = async (req, res, next) => {
  try {
      const searchQuery = req.query.searchQuery || '';
      const { sortBy } = req.query;

      const page = parseInt(req.query.page) || 1;
      const limit = 5;
      const skip = (page - 1) * limit;

      let searchCondition = { isBlocked: false };
      if (searchQuery) {
          const regex = new RegExp(searchQuery, 'i');
          searchCondition.$or = [{ productName: regex }];
      }

      let sortCriteria = {};
      switch (sortBy) {
          case 'popularity': sortCriteria = { popularity: -1 }; break;
          case 'priceLowToHigh': sortCriteria = { salePrice: 1 }; break;
          case 'priceHighToLow': sortCriteria = { salePrice: -1 }; break;
          case 'averageRatings': sortCriteria = { averageRating: -1 }; break;
          case 'featured': sortCriteria = { isFeatured: -1 }; break;
          case 'newArrivals': sortCriteria = { createdAt: -1 }; break;
          case 'aToZ': sortCriteria = { productName: 1 }; break;
          case 'zToA': sortCriteria = { productName: -1 }; break;
          default: sortCriteria = {};
      }

      const products = await Product.find(searchCondition)
          .populate('category')
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .exec();

      const totalProducts = await Product.countDocuments(searchCondition);
      const totalPages = Math.ceil(totalProducts / limit);

      let userId = req.user || req.session.user;
      let userData = userId ? await User.findById(userId) : null;
      res.locals.user = userData;

      return res.render("shop", { 
          user: userData,
          products: products,
          sortBy: sortBy || '',
          currentPage: page,
          totalPages: totalPages,
          totalProducts: totalProducts
      });
  } catch (error) {
      console.log("shop page not found:", error);
      next(error);
  }
};
module.exports = {
  getShop,
};
