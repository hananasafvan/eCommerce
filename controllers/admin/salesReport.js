
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

const getMatchCondition = (dateRange, startDate, endDate) => {
  const now = new Date();
  let matchCondition = {};

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
        if (!isNaN(start) && !isNaN(end)) {
          matchCondition.createdAt = {
            $gte: new Date(start.setHours(0, 0, 0, 0)),
            $lt: new Date(end.setHours(23, 59, 59, 999)),
          };
        }
      }
      break;
    default:
      break;
  }
  return matchCondition;
};


const getSalesReport = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const matchCondition = getMatchCondition(dateRange, startDate, endDate);

    const totalOrderCount = await Order.countDocuments(matchCondition);
    const totalSales = await Order.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, totalRevenue: { $sum: "$totalOrderPrice" } } },
    ]);
    const netSalesResult = await Order.aggregate([
      { $unwind: "$items" }, 
      {
        $match: {
          "items.status": { $in: ["Paid", "Delivered"] },
          ...matchCondition, 
        },
      },
      {
        $group: {
          _id: null,
          netSales: { $sum: "$items.totalPrice" }, 
        },
      },
    ]);
    
    const netSales = netSalesResult[0]?.netSales || 0; 
    

    const orders = await Order.find({ ...matchCondition })
      .populate("userId", "name")
      .populate("items.productId", "productName")
      .select("orderStatus paymentMethod items createdAt");

    const result = orders.flatMap((order) =>
      order.items.map((item) => ({
        orderId: order._id,
        username: order.userId ? order.userId.name : "Unknown User",
        status: item.status,
        productName: item.productId.productName,
        paymentMethod: order.paymentMethod,
      }))
    );


    const salesData = await Order.aggregate([
      { $match: matchCondition },
      {
          $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              total: { $sum: "$totalOrderPrice" },
              orders: { $push: "$$ROOT" },
          },
      },
      { $sort: { _id: 1 } },
  ]);

    res.render("salesReport", {
      totalOrderCount,
      totalRevenue: totalSales[0]?.totalRevenue || 0,
      result,
      netSales,
      salesData,
      dateRange: dateRange || "custom",
      startDate: startDate || "",
      endDate: endDate || "",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};


const getSalesReportPDF = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const matchCondition = getMatchCondition(dateRange, startDate, endDate);

    const salesData = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$totalOrderPrice" },
          orders: { $push: "$$ROOT" }, 
        },
      },
      { $sort: { _id: 1 } },
    ]);

    if (salesData.length === 0) {
      return res.status(404).send("No sales data available for the selected date range.");
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Sales_Report.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc.moveDown(2);

    salesData.forEach((data) => {
      doc.fontSize(14).text(`Date: ${data._id}`, { underline: true });
      doc.moveDown();

      
      const tableHeaders = ["Order ID", "User ID", "Total Amount (₹)", "Items"];
      const columnWidths = [180, 180, 120, 200];
      let x = doc.x;

      tableHeaders.forEach((header, index) => {
        doc.fontSize(12).text(header, x, doc.y, { continued: index < tableHeaders.length - 1 });
        x += columnWidths[index];
      });

      doc.moveDown(0.5);

      
      doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      
      data.orders.forEach((order) => {
        x = doc.x; 
        const items = order.items
          .map((item) => `${item.productId} (${item.quantity} pcs)`)
          .join(", ");

        const rowData = [
          order._id,
          order.userId,
          `₹${order.totalOrderPrice.toFixed(2)}`,
          items,
        ];

        rowData.forEach((cell, index) => {
          doc.text(cell, x, doc.y, { continued: index < rowData.length - 1, width: columnWidths[index] });
          x += columnWidths[index];
        });
        doc.moveDown(0.5);
      });

      doc.moveDown(2); 
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
      const matchCondition = getMatchCondition(dateRange, startDate, endDate);

      const salesData = await Order.aggregate([
          { $match: matchCondition },
          {
              $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  total: { $sum: "$totalOrderPrice" },
                  orders: { $push: "$$ROOT" }, 
              },
          },
          { $sort: { _id: 1 } },
      ]);


      if (salesData.length === 0) {
          return res.status(404).send("No sales data available for the selected date range.");
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales Report");

      
      worksheet.columns = [
          { header: "Date", key: "date", width: 15 },
          { header: "Order ID", key: "orderId", width: 20 },
          { header: "User ID", key: "userId", width: 20 },
          { header: "Total Amount (₹)", key: "total", width: 20 },
          { header: "Items", key: "items", width: 50 },
      ];

      salesData.forEach((data) => {
          data.orders.forEach((order) => {
              const items = order.items
                  .map((item) => `${item.productId} (${item.quantity} pcs)`)
                  .join(", ");

              worksheet.addRow({
                  date: data._id,
                  orderId: order._id,
                  userId: order.userId,
                  total: order.totalOrderPrice,
                  items,
              });
          });
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



module.exports={
  getMatchCondition,
  getSalesReport,
  getSalesReportPDF,
  getSalesReportExcel
}