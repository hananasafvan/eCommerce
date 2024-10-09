const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema')
const Product= require("../../models/productShema")
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {}
};

function generateOtp() {
  return Math.floor(10000 + Math.random() * 900000).toString();
}
async function sentVerificationEmail(email, otp) {
  try {
    const transpoter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transpoter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "verify your account",
      text: `your OTP is ${otp}`,
      html: `<b>Your OTP :</b> `,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.error("sent email ", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword } = req.body;

    if (password !== cPassword) {
      return res.render("signup", { message: "password note match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "user alredy exist with this email",
      });
    }
    const otp = generateOtp();

    const emailSent = await sentVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email-error");
    }
    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };
    res.render("verify-otp");
    console.log("otp sent", otp);
  } catch (error) {
    console.error("signup error", error);

    if (error.code === 11000) {
      // Duplicate key error
      console.error("Duplicate key error", error.message);
      res.status(400).render("signup", {
        message: "An account with this email already exists.",
      });
    } else {
      console.error("Signup error", error);
      res.redirect("/pageNotFound");
    }
  }
};

const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("home page not loded", error);
    res.status(500).send("Server error");
  }
};

const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    const categories = await Category.find({isListed:true})
    let productData = await Product.find({
      isBlocked:false,
      category:{$in:categories.map(category =>category._id)},
      quantity:{$gt:0}
    })
     
    productData.sort((a,b)=>(b.createdon)-(a.createdon))
    productData= productData.slice(0,4)



    if (user) {
      const userData = await User.findById(user);
      if (userData && !userData.isBlocked) {
        res.locals.user = userData;
        return res.render("home", { user: userData,products:productData });
      } else {
        // Destroy the session and redirect to login if blocked
        req.session.destroy((err) => {
          if (err) {
            console.log("Session destruction error:", err);
            return res.status(500).send("Internal server error");
          }
          res.redirect("/login");
        });
      }
    } else {
      res.locals.user = null;
      return res.render("home",{
        products:productData
      });
    }
  } catch (error) {
    console.log("Home page not found:", error);
    res.status(500).send("Server error");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    return passwordHash;
  } catch (error) {}
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);
    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      });
      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "invalid otp , pleace try again" });
    }
  } catch (error) {
    console.error("error veryfing otp", error);
    res.status(500).json({ success: false, message: "An error occure" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "email not found" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;
    const emailSent = await sentVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend otp", otp);
      res
        .status(200)
        .json({ success: true, message: "otp resend successfuly" });
    } else {
      res.status(500).json({
        success: false,
        message: "faild to resend otp pleace try agan",
      });
    }
  } catch (error) {
    console.error("error resending otp", error);
    res.status(500).json({
      success: false,
      message: "internal server error.pleace try again",
    });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email });
    if (!findUser) {
      return res.render("login", { message: "user not found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "user is blocked by admin" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Incorret password" });
    }
    req.session.user = findUser._id;
    res.redirect("/");
  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed" });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("session destruction error", err);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("logout error");
    res.redirect("/pageNotFound");
  }
};

const googleCallback = (req, res) => {
  req.session.user = req.user;
  res.redirect("/");
};

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  googleCallback,
};
