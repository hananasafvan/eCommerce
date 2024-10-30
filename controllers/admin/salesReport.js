const mongoose = require("mongoose");
const ejs = require("ejs");

const Order = require("../../models/orderSchema");
const Product = require("../../models/productShema");
const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");

const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const getSalesReport = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    let matchCondition = {};
    const now = new Date();

    switch (dateRange) {
      case "daily":
        matchCondition.createdAt = {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lt: new Date(now.setHours(23, 59, 59, 999)),
        };
        break;
      case "weekly":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6));
        matchCondition.createdAt = {
          $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
          $lt: new Date(endOfWeek.setHours(23, 59, 59, 999)),
        };
        break;
      case "monthly":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        matchCondition.createdAt = {
          $gte: new Date(startOfMonth.setHours(0, 0, 0, 0)),
          $lt: new Date(endOfMonth.setHours(23, 59, 59, 999)),
        };
        break;
      case "yearly":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        matchCondition.createdAt = {
          $gte: new Date(startOfYear.setHours(0, 0, 0, 0)),
          $lt: new Date(endOfYear.setHours(23, 59, 59, 999)),
        };
        break;
      case "custom":
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (isNaN(start) || isNaN(end)) {
            return res.status(400).send("Invalid dates");
          }
          matchCondition.createdAt = {
            $gte: new Date(start.setHours(0, 0, 0, 0)),
            $lt: new Date(end.setHours(23, 59, 59, 999)),
          };
        } else {
          return res
            .status(400)
            .send("Please provide both start and end dates for custom range.");
        }
        break;
      default:
        break;
    }

    // sales report data
    const totalOrderCount = await Order.countDocuments(matchCondition);
    const totalSales = await Order.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, totalRevenue: { $sum: "$totalOrderPrice" } } },
    ]);
    const paymentCompletedOrders = await Order.countDocuments({
      status: "Completed",
      ...matchCondition,
    });
    const totalOfferPrices = await Order.aggregate([
      { $match: { coupon: { $ne: null }, ...matchCondition } },
      { $group: { _id: null, totalOfferPrice: { $sum: "$couponAmount" } } },
    ]);
    const refundAmount = await Order.aggregate([
      { $match: { status: "Refunded", ...matchCondition } },
      { $group: { _id: null, totalRefund: { $sum: "$totalOrderPrice" } } },
    ]);
    const productDiscount = await Product.aggregate([
      {
        $project: {
          _id: 0,
          discountAmount: {
            $multiply: [{ $divide: ["$productOffer", 100] }, "$regularPrice"],
          },
        },
      },
      { $group: { _id: null, productDiscount: { $sum: "$discountAmount" } } },
    ]);
    console.log(productDiscount);
    const couponDiscount = await Coupon.aggregate([
      { $group: { _id: null, couponDiscount: { $sum: "$discountValue" } } },
    ]);
    const deliveredSales = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "Delivered", ...matchCondition } },
      {
        $group: {
          _id: null,
          totalDeliveredRevenue: { $sum: "$items.totalPrice" },
        },
      },
    ]);

    console.log(deliveredSales);

    const returndSales = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "Returned", ...matchCondition } },
      {
        $group: {
          _id: null,
          totalReturndPrice: { $sum: "$items.totalPrice" },
        },
      },
    ]);

    const orders = await Order.find({
      "items.status": { $in: ["Delivered", "Paid"] },
    })
      .populate({
        path: "userId",
        select: "name",
        model: User,
      })
      .populate({
        path: "items.productId",
        select: "productName",
        model: Product,
      })
      .select("orderStatus paymentMethod items");

    const result = orders
      .map((order) => {
        return order.items
          .filter(
            (item) => item.status === "Delivered" || item.status === "Paid"
          )
          .map((item) => ({
            orderId: order._id,
            username: order.userId.name,
            status: item.status,
            productName: item.productId.productName,
            paymentMethod: order.paymentMethod,
          }));
      })
      .flat();

    console.log(result);
    req.result = result;
    console.log("req.salesreport", req.result);
    res.render("salesReport", {
      totalOrderCount,
      totalRevenue: totalSales[0]?.totalRevenue || 0,
      totalDeliveredRevenue: deliveredSales[0]?.totalDeliveredRevenue,
      totalReturndPrice: returndSales[0]?.totalReturndPrice,
      paymentCompletedOrders,
      totalOfferPrice: totalOfferPrices[0]?.totalOfferPrice || 0,

      refundAmount: refundAmount[0]?.totalRefund || 0,
      productDiscount: productDiscount[0]?.productDiscount || 0,
      couponDiscount: couponDiscount[0]?.couponDiscount || 0,
      result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getSalesReportPDF = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    let matchCondition = {};
    const now = new Date();

    const totalOrderCount = await Order.countDocuments(matchCondition);
    const totalSales = await Order.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, totalRevenue: { $sum: "$totalOrderPrice" } } },
    ]);
    const paymentCompletedOrders = await Order.countDocuments({
      status: "Completed",
      ...matchCondition,
    });
    const totalOfferPrices = await Order.aggregate([
      { $match: { coupon: { $ne: null }, ...matchCondition } },
      { $group: { _id: null, totalOfferPrice: { $sum: "$couponAmount" } } },
    ]);
    const refundAmount = await Order.aggregate([
      { $match: { status: "Refunded", ...matchCondition } },
      { $group: { _id: null, totalRefund: { $sum: "$totalOrderPrice" } } },
    ]);
    const productDiscount = await Product.aggregate([
      {
        $project: {
          discountAmount: {
            $multiply: [{ $divide: ["$productOffer", 100] }, "$regularPrice"],
          },
        },
      },
      { $group: { _id: null, productDiscount: { $sum: "$discountAmount" } } },
    ]);
    const couponDiscount = await Coupon.aggregate([
      { $group: { _id: null, couponDiscount: { $sum: "$discountValue" } } },
    ]);
    const deliveredSales = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "Delivered", ...matchCondition } },
      {
        $group: {
          _id: null,
          totalDeliveredRevenue: { $sum: "$items.totalPrice" },
        },
      },
    ]);
    const returndSales = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "Returned", ...matchCondition } },
      {
        $group: {
          _id: null,
          totalReturndPrice: { $sum: "$items.totalPrice" },
        },
      },
    ]);

    const doc = new PDFDocument();
    const fileName = "Sales_Report.pdf";
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc
      .fontSize(16)
      .text("Sales Report Summary", { align: "center" })
      .moveDown();
    doc
      .fontSize(12)
      .text(`Total Orders: ${totalOrderCount}`)
      .text(`Total Revenue: ${totalSales[0]?.totalRevenue || 0}`)
      .text(`Completed Payments: ${paymentCompletedOrders}`)
      .text(`Total Offer Prices: ${totalOfferPrices[0]?.totalOfferPrice || 0}`)
      .text(`Refund Amount: ${refundAmount[0]?.totalRefund || 0}`)
      .text(`Product Discount: ${productDiscount[0]?.productDiscount || 0}`)
      .text(`Coupon Discount: ${couponDiscount[0]?.couponDiscount || 0}`)
      .text(
        `Delivered Sales Revenue: ${
          deliveredSales[0]?.totalDeliveredRevenue || 0
        }`
      )
      .text(`Returned Sales Price: ${returndSales[0]?.totalReturndPrice || 0}`)
      .moveDown();

    const orders = await Order.find({
      "items.status": { $in: ["Delivered", "Paid"] },
    })
      .populate("userId", "name")
      .populate("items.productId", "productName")
      .select("orderStatus paymentMethod items");
    const result = orders.flatMap((order) =>
      order.items
        .filter((item) => ["Delivered", "Paid"].includes(item.status))
        .map((item) => ({
          orderId: order._id,
          username: order.userId.name,
          status: item.status,
          productName: item.productId.productName,
          paymentMethod: order.paymentMethod,
        }))
    );

    result.forEach((item) => {
      doc
        .fontSize(12)
        .text(`Order ID: ${item.orderId}`)
        .text(`Username: ${item.username}`)
        .text(`Status: ${item.status}`)
        .text(`Product Name: ${item.productName}`)
        .text(`Payment Method: ${item.paymentMethod}`)
        .moveDown();
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

const getSalesReportExcel = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    let matchCondition = {};
    const now = new Date();

    const totalOrderCount = await Order.countDocuments(matchCondition);
    const totalSales = await Order.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, totalRevenue: { $sum: "$totalOrderPrice" } } },
    ]);
    const paymentCompletedOrders = await Order.countDocuments({
      status: "Completed",
      ...matchCondition,
    });
    const totalOfferPrices = await Order.aggregate([
      { $match: { coupon: { $ne: null }, ...matchCondition } },
      { $group: { _id: null, totalOfferPrice: { $sum: "$couponAmount" } } },
    ]);
    const refundAmount = await Order.aggregate([
      { $match: { status: "Refunded", ...matchCondition } },
      { $group: { _id: null, totalRefund: { $sum: "$totalOrderPrice" } } },
    ]);
    const productDiscount = await Product.aggregate([
      {
        $project: {
          discountAmount: {
            $multiply: [{ $divide: ["$productOffer", 100] }, "$regularPrice"],
          },
        },
      },
      { $group: { _id: null, productDiscount: { $sum: "$discountAmount" } } },
    ]);
    const couponDiscount = await Coupon.aggregate([
      { $group: { _id: null, couponDiscount: { $sum: "$discountValue" } } },
    ]);
    const deliveredSales = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "Delivered", ...matchCondition } },
      {
        $group: {
          _id: null,
          totalDeliveredRevenue: { $sum: "$items.totalPrice" },
        },
      },
    ]);
    const returndSales = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "Returned", ...matchCondition } },
      {
        $group: {
          _id: null,
          totalReturndPrice: { $sum: "$items.totalPrice" },
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.addRow(["Summary Data"]);
    worksheet.addRow(["Total Orders", totalOrderCount]);
    worksheet.addRow(["Total Revenue", totalSales[0]?.totalRevenue || 0]);
    worksheet.addRow(["Completed Payments", paymentCompletedOrders]);
    worksheet.addRow([
      "Total Offer Prices",
      totalOfferPrices[0]?.totalOfferPrice || 0,
    ]);
    worksheet.addRow(["Refund Amount", refundAmount[0]?.totalRefund || 0]);
    worksheet.addRow([
      "Product Discount",
      productDiscount[0]?.productDiscount || 0,
    ]);
    worksheet.addRow([
      "Coupon Discount",
      couponDiscount[0]?.couponDiscount || 0,
    ]);
    worksheet.addRow([
      "Delivered Sales Revenue",
      deliveredSales[0]?.totalDeliveredRevenue || 0,
    ]);
    worksheet.addRow([
      "Returned Sales Price",
      returndSales[0]?.totalReturndPrice || 0,
    ]);
    worksheet.addRow([]);

    worksheet.addRow([
      "Order ID",
      "Username",
      "Status",
      "Product Name",
      "Payment Method",
    ]);

    const orders = await Order.find({
      "items.status": { $in: ["Delivered", "Paid"] },
    })
      .populate("userId", "name")
      .populate("items.productId", "productName")
      .select("orderStatus paymentMethod items");
    const result = orders.flatMap((order) =>
      order.items
        .filter((item) => ["Delivered", "Paid"].includes(item.status))
        .map((item) => ({
          orderId: order._id,
          username: order.userId.name,
          status: item.status,
          productName: item.productId.productName,
          paymentMethod: order.paymentMethod,
        }))
    );

    result.forEach((item) => {
      worksheet.addRow([
        item.orderId,
        item.username,
        item.status,
        item.productName,
        item.paymentMethod,
      ]);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Sales_Report.xlsx"'
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

module.exports = { getSalesReport, getSalesReportPDF, getSalesReportExcel };
