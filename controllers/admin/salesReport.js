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
      { $match: { ...matchCondition, "items.status": { $in: ["Paid", "Delivered"] } } },
      { $group: { _id: null, netSales: { $sum: "$items.totalPrice" } } },
    ]);

    const netSales = netSalesResult[0]?.netSales || 0;

    const orders = await Order.find(matchCondition)
      .populate("userId", "name")
      .populate("items.productId", "productName")
      .select("orderStatus paymentMethod items createdAt");

    const result = orders.flatMap((order) =>
      order.items.map((item) => ({
        orderId: order._id,
        username: order.userId?.name || "Unknown User",
        status: item.status,
        productName: item.productId?.productName || "Unknown Product",
        paymentMethod: order.paymentMethod,
      }))
    );

    res.render("salesReport", {
      totalOrderCount,
      totalRevenue: totalSales[0]?.totalRevenue || 0,
      netSales,
      result,
      dateRange: dateRange || "custom",
      startDate: startDate || "",
      endDate: endDate || "",
    });
  } catch (error) {
    console.error("Error in getSalesReport:", error);
    res.redirect("/pageerror");
    
  }
};




const getSalesReportPDF = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const matchCondition = getMatchCondition(dateRange, startDate, endDate);

    
    const salesData = await Order.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          userName: "$userDetails.name",
          items: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                productName: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$productDetails",
                        cond: { $eq: ["$$this._id", "$$item.productId"] },
                      },
                    },
                    0,
                  ],
                },
                quantity: "$$item.quantity",
              },
            },
          },
        },
      },
    ]);

    if (salesData.length === 0) {
      return res
        .status(404)
        .send("No sales data available for the selected date range.");
    }

    // Calculate summary data
    const totalOrderCount = salesData.length;
    
    const totalSales = await Order.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, totalRevenue: { $sum: "$totalOrderPrice" } } },
    ]);
    
    const netSalesResult = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { ...matchCondition, "items.status": { $in: ["Paid", "Delivered"] } } },
      { $group: { _id: null, netSales: { $sum: "$items.totalPrice" } } },
    ]);
    
    const totalRevenue = totalSales[0]?.totalRevenue || 0;
    const netSales = netSalesResult[0]?.netSales || 0;
    
    console.log("Total Revenue:", totalRevenue, "Net Sales:", netSales);
    
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Sales_Report.pdf"'
    );
    doc.pipe(res);

    
    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc.moveDown(2);

  
    const tableHeaders = ["Sl No", "Date", "Order ID", "User", "Items"];
    const columnWidths = [50, 80, 150, 100, 320]; 
    const startX = 60;
    let y = doc.y;

    const drawRow = (y) => {
      doc.moveTo(startX, y)
        .lineTo(550, y)
        .stroke();
    };

    const drawTableHeaders = () => {
      tableHeaders.forEach((header, index) => {
        doc.fontSize(12).text(header, startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), y + 5, {
          width: columnWidths[index],
          align: "left",
        });
      });
      drawRow(y + 20);
      y += 25; 
    };

    const drawTableRow = (slNo, date, orderId, userName, items, y) => {
      const rowHeight = Math.max(
        doc.heightOfString(items, { width: columnWidths[4] }) + 5,
        20
      ); 
      doc.fontSize(10).text(slNo, startX, y + 5, { width: columnWidths[0], align: "center" });
      doc.text(date, startX + columnWidths[0], y + 5, { width: columnWidths[1], align: "left" });
      doc.text(orderId, startX + columnWidths[0] + columnWidths[1], y + 5, { width: columnWidths[2], align: "left" });
      doc.text(userName, startX + columnWidths[0] + columnWidths[1] + columnWidths[2], y + 5, {
        width: columnWidths[3],
        align: "left",
      });
      doc.text(items, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y + 5, {
        width: columnWidths[4],
        align: "left",
        lineBreak: true,
      });
      drawRow(y + rowHeight);
      return rowHeight; 
    };

    drawTableHeaders();

  
    salesData.forEach((order, index) => {
      const items = order.items
        .map((item) => `${item.productName?.productName || "Unknown"} (${item.quantity} pcs)`)
        .join(", ");
      const rowHeight = drawTableRow(
        index + 1,
        new Date(order.createdAt).toISOString().split("T")[0],
        order._id,
        order.userName,
        items,
        y
      );
      y += rowHeight; 

      
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
        drawTableHeaders(); 
      }
    });

    doc.addPage(); 
    doc.fontSize(14).text("Summary", { underline: true, align: "left" });
    doc.moveDown();
    doc.fontSize(12).text(`Total Orders: ${totalOrderCount}`);
    doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
    doc.text(`Net Sales: ₹${netSales.toFixed(2)}`);
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

    
    const totalOrderCount = await Order.countDocuments(matchCondition);
    const totalSales = await Order.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, totalRevenue: { $sum: "$totalOrderPrice" } } },
    ]);
    
    const netSalesResult = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { ...matchCondition, "items.status": { $in: ["Paid", "Delivered"] } } },
      { $group: { _id: null, netSales: { $sum: "$items.totalPrice" } } },
    ]);
    
    const totalRevenue = totalSales[0]?.totalRevenue || 0;
    const netSales = netSalesResult[0]?.netSales || 0;
    
    console.log("Total Revenue:", totalRevenue, "Net Sales:", netSales);
    
    const salesData = await Order.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
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
      return res
        .status(404)
        .send("No sales data available for the selected date range.");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");


    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Order ID", key: "orderId", width: 20 },
      { header: "User Name", key: "userName", width: 20 }, 
      { header: "Total Amount (₹)", key: "total", width: 20 },
      { header: "Product Names", key: "products", width: 50 },
    ];

    
    salesData.forEach((data) => {
      data.orders.forEach((order) => {
        const productNames = order.items
          .map((item) => {
            const product = order.productDetails.find(
              (prod) => String(prod._id) === String(item.productId)
            );
            return product ? `${product.productName} (${item.quantity} pcs)` : "Unknown Product";
          })
          .join(", ");

        worksheet.addRow({
          date: data._id,
          orderId: order._id,
          userName: order.userDetails.name, 
          total: order.totalOrderPrice,
          products: productNames, 
        });
      });
    });

    
    worksheet.addRow([]);
    worksheet.addRow([]);

    
    worksheet.addRow(["Summary"]);
    worksheet.addRow(["Total Orders", totalOrderCount]);
    worksheet.addRow(["Total Revenue (₹)", totalRevenue]);
    worksheet.addRow(["Net Sales (₹)", netSales]);

    
    const summaryStartRow = worksheet.lastRow.number - 3;
    worksheet.mergeCells(`A${summaryStartRow}:B${summaryStartRow}`);
    worksheet.getRow(summaryStartRow).font = { bold: true };

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

module.exports = {
  getMatchCondition,
  getSalesReport,
  getSalesReportPDF,
  getSalesReportExcel,
};
