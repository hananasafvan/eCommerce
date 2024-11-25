const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require('../../models/orderSchema')
const moment = require("moment");


const pageerror = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashbord");
  }
  res.render("admin-login", { message: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passwordMatch = bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin");
      } else {
        return res.redirect("/login");
      }
    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    console.log("login error", error);
    return res.redirect("/pageerror");
  }
};



const getFilteredOrders = async (timePeriod) => {
  const now = moment();
  let startDate;
  switch (timePeriod) {
    case 'daily':
      startDate = now.subtract(1, 'days').startOf('day');
      break;
    case 'weekly':
      startDate = now.subtract(1, 'weeks').startOf('week');
      break;
    case 'monthly':
      startDate = now.subtract(1, 'months').startOf('month');
      break;
    case 'yearly':
      startDate = now.subtract(1, 'years').startOf('year');
      break;

    default:
      startDate = now.subtract(1, 'weeks').startOf('week');
      break;
  }

  return await Order.find({
    createdAt: { $gte: startDate.toDate() },
  });
};




const getTopProduct = async (timePeriod) => {
  const orders = await getFilteredOrders(timePeriod);

  return await Order.aggregate([
    { $match: { _id: { $in: orders.map(order => order._id) } } }, 
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { orderCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      $project: {
        productId: "$_id",
        orderCount: 1,
        productDetails: { $arrayElemAt: ["$productDetails", 0] },
      },
    },
  ]);
};

const getTopBrands = async (timePeriod) => {
  const orders = await getFilteredOrders(timePeriod);

  return await Order.aggregate([
    { $match: { _id: { $in: orders.map(order => order._id) } } }, // Filter orders
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $group: {
        _id: "$productDetails.brand",
        totalSales: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalSales: -1 } },
    { $limit: 10 },
    {
      $project: {
        brand: "$_id",
        totalSales: 1,
      },
    },
  ]);
};

const getTopCategorys = async (timePeriod) => {
  const orders = await getFilteredOrders(timePeriod);

  return await Order.aggregate([
    { $match: { _id: { $in: orders.map(order => order._id) } } }, // Filter orders
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $lookup: {
        from: "categories",
        localField: "productDetails.category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    { $unwind: "$categoryDetails" },
    {
      $group: {
        _id: "$categoryDetails.name", // Group by category name
        totalSales: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalSales: -1 } },
    { $limit: 10 },
    {
      $project: {
        category: "$_id", // Rename _id to category for clarity
        totalSales: 1,
      },
    },
  ]);
};

/******  chart  *****/

const getRevenueByPaymentMethod = async (timePeriod) => {
  const now = moment();
  let startDate;
  switch (timePeriod) {
    case 'daily':
      startDate = now.subtract(1, 'days').startOf('day');
      break;
    case 'weekly':
      startDate = now.subtract(1, 'weeks').startOf('week');
      break;
    case 'monthly':
      startDate = now.subtract(1, 'months').startOf('month');
      break;
    case 'yearly':
      startDate = now.subtract(1, 'years').startOf('year');
      break;
    default:
      startDate = now.subtract(1, 'weeks').startOf('week');
      break;
  }

  // Aggregate data grouped by payment method
  const revenueByPaymentMethod = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate.toDate() }, // Filter by time period
      },
    },
    {
      $group: {
        _id: "$paymentMethod", // Group by payment method
        totalRevenue: { $sum: "$totalOrderPrice" }, // Sum revenue
      },
    },
  ]);

  
  const formattedData = revenueByPaymentMethod.reduce((acc, item) => {
    acc[item._id] = item.totalRevenue;
    return acc;
  }, {});

  return formattedData;
};

const getOrderCountByCategory = async(timePeriod)=>{
  const now = moment();
  let startDate;

  switch (timePeriod) {
    case 'daily':
      startDate = now.subtract(1, 'days').startOf('day');
      break;
    case 'weekly':
      startDate = now.subtract(1, 'weeks').startOf('week');
      break;
    case 'monthly':
      startDate = now.subtract(1, 'months').startOf('month');
      break;
    case 'yearly':
      startDate = now.subtract(1, 'years').startOf('year');
      break;
    default:
      startDate = now.subtract(1, 'weeks').startOf('week');
      break;
  }


  const categoryOrderCount = await Order.aggregate([
    {
      $match:{
        createdAt:{$gte:startDate.toDate()},
      },
    },
    {
      $unwind:'$items',
    },
    {
      $lookup:{
        from:'products',
        localField:'items.productId',
        foreignField:'_id',
        as:'productDetails'
      },
    },
    {
      $unwind:'$productDetails'
    },
    {
      $lookup:{
        from:'categories',
        localField:"productDetails.category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: "$categoryDetails",
    },
    {
      $group: {
        _id: "$categoryDetails.name",
        orderCount: { $sum: 1 }, 
      },
    },
    {
      $sort: { orderCount: -1 },
    },
  ])

  return categoryOrderCount.reduce((acc, item) => {
    acc[item._id] = item.orderCount;
    return acc;
  }, {});
}

const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      const timePeriod = req.query.timePeriod || 'weekly'; 
  
      console.log('load dashbord time period',timePeriod);
            
      const bestsellproduct = await getTopProduct(timePeriod);   
      const bestsellerbrand = await getTopBrands(timePeriod);
      const bestsellercategory = await getTopCategorys(timePeriod)
      const revenueByPaymentMethod = await getRevenueByPaymentMethod(timePeriod);
      const countcategoryOder= await getOrderCountByCategory(timePeriod)  

      res.render("dashboard", {
         bestsellproduct,
         bestsellerbrand,
         bestsellercategory,
         timePeriod, 
         revenueByPaymentMethod, 
         countcategoryOder,
         
        });
    } catch (error) {
      console.log(error);
      
      res.redirect("/pageNotFound");
    }
  }
};


const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroing session", error);
        return res.redirect("/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("unexpetted error during logout", error);
    res.redirect("/pageerror");
  }
};

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
};
