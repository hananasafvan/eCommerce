const mongoose = require("mongoose");
const ejs = require("ejs");

const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productShema");
const Coupon = require("../../models/couponSchema");

const PDFDocument = require("pdfkit");
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getSalesReportPDF = async (req, res) => {
  try {
    const totalOrderCount = await Order.countDocuments();
    const totalSales = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalOrderPrice" },
        },
      },
    ]);

    const paymentCompletedOrders = await Order.countDocuments({
      status: "Pending",
    });

    const totalOfferPrices = await Order.aggregate([
      {
        $match: { coupon: { $ne: null } },
      },
      {
        $group: {
          _id: null,
          totalOfferPrice: { $sum: "$totalOrderPrice" },
        },
      },
    ]);

    const productDiscount = 460;

    const totalRefunds = await Order.aggregate([
      { $match: { refundAmount: { $ne: null } } },
      {
        $group: {
          _id: null,
          refundAmount: { $sum: "$refundAmount" },
        },
      },
    ]);

    const refundAmount = totalRefunds[0]?.refundAmount || 0;

    const orders = await Order.find({}).populate("items.productId");

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=salesReport.pdf"
    );

    doc.pipe(res);

    // Add title and summary section
    doc.fontSize(20).text("Sales Summary", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Total Orders: ${totalOrderCount}`);
    doc.text(
      `Total Sales (Before Discounts): ₹${(
        totalSales[0]?.totalRevenue || 0
      ).toFixed(2)}`
    );
    doc.text(`Product Discount: ₹${productDiscount}`);
    doc.text(
      `Net Before Coupon Discounts: ₹${(
        totalSales[0]?.totalRevenue - productDiscount
      ).toFixed(2)}`
    );
    doc.text(`Coupon Discount: ₹${totalOfferPrices[0]?.totalOfferPrice || 0}`);
    doc.text(
      `Net Sales: ₹${(
        totalSales[0]?.totalRevenue -
        productDiscount -
        (totalOfferPrices[0]?.totalOfferPrice || 0)
      ).toFixed(2)}`
    );
    doc.text(`Refund Amount: ₹${refundAmount}`);
    doc.text(
      `Net Sales After Refunds: ₹${(
        totalSales[0]?.totalRevenue -
        productDiscount -
        (totalOfferPrices[0]?.totalOfferPrice || 0) -
        refundAmount
      ).toFixed(2)}`
    );
    doc.moveDown();

    // Table headers
    const headers = [
      "Order ID",
      "Order Date",
      "Grand Total",
      "Coupon Discount",
      "Payment Method",
      "Payment Status",
      "Product Name",
      "Quantity",
      "Original Price",
      "Discounted Price",
      "Subtotal",
      "Product Status",
    ];
    const columnWidths = [70, 70, 70, 70, 100, 100, 100, 50, 70, 70, 70, 80]; // Column width for each header
    let y = doc.y; // Y position to start the table

    // Draw table headers
    headers.forEach((header, i) => {
      doc.text(
        header,
        50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
        y,
        {
          width: columnWidths[i],
          align: "center",
        }
      );
    });

    y += 20; // Move y position down for the next row

    // Draw line below headers
    doc
      .moveTo(50, y - 5)
      .lineTo(550, y - 5)
      .stroke();

    // Add table rows with grid-like lines
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const couponAmount = order.coupon ? order.coupon.amount : 0;
        const row = [
          order._id,
          order.createdAt.toLocaleDateString(),
          `₹${(order.totalOrderPrice || 0).toFixed(2)}`,
          `₹${couponAmount}`,
          order.paymentMethod,
          order.paymentStatus,
          item.productId?.name || "N/A",
          `${item.quantity}`,
          `₹${(item.regularPrice || 0).toFixed(2)}`,
          `₹${(item.totalPrice || 0).toFixed(2)}`,
          `₹${(item.totalPrice || 0).toFixed(2)}`,
          item.status,
        ];

        row.forEach((cell, i) => {
          doc.text(
            cell,
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            {
              width: columnWidths[i],
              align: "center",
            }
          );
        });

        doc
          .moveTo(50, y + 15)
          .lineTo(550, y + 15)
          .stroke();
        y += 20;
      });
    });

    doc.text("Thank you for your business!", 100, y + 40, { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).send("Server Error");
  }
};

const getSalesReportExcel = async (req, res) => {
  try {
    const totalOrderCount = await Order.countDocuments();
    const totalSales = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalOrderPrice" },
        },
      },
    ]);

    const paymentCompletedOrders = await Order.countDocuments({
      status: "Completed",
    });
    const totalOfferPrices = await Order.aggregate([
      {
        $match: { coupon: { $ne: null } },
      },
      {
        $group: { _id: null, totalOfferPrice: { $sum: "$totalOrderPrice" } },
      },
    ]);

    const productDiscount = 460;

    const orders = await Order.find()
      .populate({
        path: "items.productId",
        select: "name regularPrice salesPrice",
      })
      .populate({
        path: "coupon",
        select: "discountValue",
      })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    //summary data
    worksheet.addRow(["Metric", "Value"]);
    worksheet.addRow(["Total Order Count", totalOrderCount]);
    worksheet.addRow(["Total Revenue", totalSales[0]?.totalRevenue || 0]);
    worksheet.addRow(["Payment Completed Orders", paymentCompletedOrders]);
    worksheet.addRow([
      "Total Offer Price",
      totalOfferPrices[0]?.totalOfferPrice || 0,
    ]);
    worksheet.addRow(["Product Discount", productDiscount]);

    worksheet.addRow([]);

    worksheet.addRow([
      "Order ID",
      "Order Date",
      "Total Order Price",
      "Coupon Discount",
      "Payment Method",
      "Product Name",
      "Quantity",
      "Regular Price",
      "Sales Price",
      "Product Status",
    ]);

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const product = item.productId;
        worksheet.addRow([
          order._id,
          order.createdAt,
          order.totalOrderPrice,
          order.coupon ? order.coupon.discountValue : 0,
          order.paymentMethod,
          product.name,
          item.quantity,
          product.regularPrice,
          product.salesPrice,
          item.status,
        ]);
      });
    });

    const excelBuffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=salesReport.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(excelBuffer);
  } catch (err) {
    console.error("Error generating Excel report:", err);
    res.status(500).send("Server Error");
  }
};

module.exports = { getSalesReport, getSalesReportPDF, getSalesReportExcel };
