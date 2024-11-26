const Product = require("../../models/productShema");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP for password reset",
      text: `your OTP is ${otp}`,
      html: `<b><h4>your OTP ${otp}</h4><br></b>`,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("email send:", info.messageId);
    return true;
  } catch (error) {
    console.error("error sending email", error);
    return false;
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const searchQuery = req.query.searchQuery || "";
    const sortBy = req.query.sortBy || "";
    const category = req.query.category || "";
    const brand = req.query.brand || "";

    const page = parseInt(req.query.page) || 1;
    const limit = 24;
    const skip = (page - 1) * limit;

    let searchCondition = { isBlocked: false };

    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      searchCondition.$or = [{ productName: regex }];
    }

    if (category) {
      searchCondition.category = category;
    }

    if (brand) {
      searchCondition.brand = brand;
    }

    let sortCriteria = {};
    switch (sortBy) {
      case "popularity":
        sortCriteria = { popularity: -1 };
        break;
      case "priceLowToHigh":
        sortCriteria = { salePrice: 1 };
        break;
      case "priceHighToLow":
        sortCriteria = { salePrice: -1 };
        break;
      case "averageRatings":
        sortCriteria = { averageRating: -1 };
        break;
      case "featured":
        sortCriteria = { isFeatured: -1 };
        break;
      case "newArrivals":
        sortCriteria = { createdAt: -1 };
        break;
      case "aToZ":
        sortCriteria = { productName: 1 };
        break;
      case "zToA":
        sortCriteria = { productName: -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    const products = await Product.find(searchCondition)
      .populate({
        path: "category",
        match: { isListed: true },
      })
      .populate({
        path: "brand",
        match: { isListed: true },
      })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .exec();

    const filteredProducts = products.filter(
      (product) => product.category !== null && product.brand !== null
    );

    const totalProducts = await Product.countDocuments(searchCondition);
    const totalPages = Math.ceil(totalProducts / limit);

    let userId = req.user || req.session.user;
    let userData = userId ? await User.findById(userId) : null;

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isListed: true });

    res.locals.user = userData;

    return res.render("shop", {
      user: userData,
      products: filteredProducts,
      sortBy,
      searchQuery,
      category,
      brand,
      categories,
      brands,
      currentPage: page,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    console.log("shop page not found:", error);
    next(error);
  }
};

const getProductDetails = async (req, res) => {
  const userId = req.session.user || req.user;
  try {
    const user = req.session.user || null;
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    if (product.isBlocked) {
      req.session.destroy((err) => {
        if (err) {
          console.log("Session destruction error:", err);
          return res.status(500).send("Internal server error");
        }
        return res.render("productDetails", {
          message: "admin has blocked this product",
          product: null,
        });
      });
    } else {
      const relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        isBlocked: false,
      }).limit(4);
      res.render("productDetails", {
        product,
        user: userData,
        relatedProducts,
      });
    }
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).send("Server Error");
  }
};

// Forgot Password
const getForgotpassword = async (req, res) => {
  try {
    res.render("forgotPassword");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgotPass-otp");
        console.log("OTP:", otp);
      } else {
        res.json({
          success: false,
          message: "failde to send otp, pleace try again",
        });
      }
    } else {
      res.render("forgotPassword");
      message: "User with this email does not exist";
    }
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log(error);
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    const enterdOtp = req.body.otp;
    if (enterdOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({
        success: false,
        message: "OTP not maching",
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "An error occure pleace try again" });
    console.log(error);
  }
};

const getResetPassPage = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log(error);
  }
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log("resending otp to email", email);
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("otp:", otp);
      res
        .status(200)
        .json({ success: true, message: "Resend OTP Successfuly" });
    }
  } catch (error) {
    console.error("error in resend otp", error);
    res.status(500).json({ success: false, message: "internal server error" });
  }
};

const postNewPassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    if (newPass1 === newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      res.redirect("/login");
    } else {
      res.render("reset-password", { message: "passwords not mach" });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log(error);
  }
};

module.exports = {
  getProducts,
  getProductDetails,

  getForgotpassword,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword,
};
