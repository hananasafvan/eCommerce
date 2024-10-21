const mongoose = require("mongoose");
const ejs = require("ejs");
const path = require("path");
const ExcelJS = require('exceljs');
const puppeteer = require("puppeteer");
const Order = require("../../models/orderSchema"); 


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
          return res.status(400).send("Please provide both start and end dates for custom range.");
        }
        break;
      default:
        break;
    }

    // Fetch orders based on date range
    const totalOrderCount = await Order.countDocuments(matchCondition);
    const totalSales = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalOrderPrice" },
        },
      },
    ]);

    const paymentCompletedOrders = await Order.countDocuments({ status: "Complited", ...matchCondition });
    console.log('paymentCompletedOrders',paymentCompletedOrders);


    const totalOfferPrices = await Order.aggregate([
      { 
        $match: { coupon: { $ne: null }, ...matchCondition } 
      },
      {
        $group: {
          _id: null,
          totalOfferPrice: { $sum: "$totalOrderPrice" },
        },
      },
    ]);

    // Render data to EJS
    res.render("salesReport", {
      totalOrderCount,
      totalRevenue: totalSales[0]?.totalRevenue || 0,
      paymentCompletedOrders,
      totalOfferPrice: totalOfferPrices[0]?.totalOfferPrice || 0,
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

  
    const paymentCompletedOrders = await Order.countDocuments({ status: "Pending" });
console.log('paymentCompletedOrders',paymentCompletedOrders);

    
    const totalOfferPrices = await Order.aggregate([
      { 
        $match: { coupon: { $ne: null } } 
      },
      {
        $group: {
          _id: null,
          totalOfferPrice: { $sum: "$totalOrderPrice" }, 
        },
      },
    ]);

  
    const html = await ejs.renderFile(path.join(__dirname, "../../views/admin/salesReport.ejs"), {
      totalOrderCount,
      totalRevenue: totalSales[0]?.totalRevenue || 0,
      paymentCompletedOrders,
      totalOfferPrice: totalOfferPrices[0]?.totalOfferPrice || 0,
    });

    
    console.log(html);


    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'load', timeout: 0 });

    
    const pdf = await page.pdf({ format: "A4" });
if (!pdf || pdf.length === 0) {
  throw new Error("PDF generation failed");
}

    await browser.close();
    console.log('PDF size:', pdf.length);

  
    

    res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", "attachment; filename=salesReport.pdf");
res.send(pdf);

  } catch (err) {
    console.error("Error generating PDF:", err);
  res.status(500).send("Server Error");
  }
};

const getSalesReportExcel = async (req, res) => {
  try {
    
    const totalOrderCount = await Order.countDocuments();
    const totalSales = await Order.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$totalOrderPrice" } } }]);
    const paymentCompletedOrders = await Order.countDocuments({ status: "Completed" });
    const totalOfferPrices = await Order.aggregate([{ $match: { coupon: { $ne: null } } }, { $group: { _id: null, totalOfferPrice: { $sum: "$totalOrderPrice" } } }]);

    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    
    worksheet.addRow(['Metric', 'Value']);
    worksheet.addRow(['Total Order Count', totalOrderCount]);
    worksheet.addRow(['Total Revenue', totalSales[0]?.totalRevenue || 0]);
    worksheet.addRow(['Payment Completed Orders', paymentCompletedOrders]);
    worksheet.addRow(['Total Offer Price', totalOfferPrices[0]?.totalOfferPrice || 0]);

  
    const excelBuffer = await workbook.xlsx.writeBuffer();

  
    res.setHeader("Content-Disposition", "attachment; filename=salesReport.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  
    res.send(excelBuffer);
  } catch (err) {
    console.error("Error generating Excel report:", err);
    res.status(500).send("Server Error");
  }
};


module.exports = 
{ getSalesReport,
  getSalesReportPDF, 
  getSalesReportExcel,
 };
