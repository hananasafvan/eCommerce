const Product = require("../../models/productShema");
const User = require("../../models/userSchema");
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')

function generateOtp(){
  const digits = '1234567890';
  let otp =''
  for(let i=0;i<6;i++){
    otp+=digits[(Math.floor(Math.random()*10))]
  }
  return otp;
}

const  sendVerificationEmail = async(email,otp)=>{
  try {
    const transporter = nodemailer.createTransport({
      service:'gmail',
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD,
      }
    })

const mailOptions ={ 
  from:process.env.NODEMAILER_EMAIL,
  to:email,
  subject:"Your OTP for password reset",
  text:`your OTP is ${otp}`,
  html:`<b><h4>your OTP ${otp}</h4><br></b>`
}
const info = await transporter.sendMail(mailOptions)
console.log('email send:',info.messageId)
return true
  } catch (error) {
    console.error('error sending email',error);
    return false
  }
}

const securePassword = async(password)=>{
  try {
    const passwordHash = await bcrypt.hash(password,10)
    return passwordHash
  } catch (error) {
    console.log(error);
    
  }
}




// Get all products to list on Home and Shop pages
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({quantity:{$gt:0}});
    const user = req.session.user || null;
    res.render("shop", { products,user }); // Render the shop page with products data
  
  
  
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server Error");
  }
};

// Get product details by ID
const getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId); // Fetch a specific product by its ID
    const user = req.session.user || null;  
    if (!product) {
      return res.status(404).send("Product not found");
    }

if(product.isBlocked){
  req.session.destroy((err) => {
    if (err) {
      console.log("Session destruction error:", err);
      return res.status(500).send("Internal server error");
    }
    return res.render('productDetails',{
      message:'admin has blocked this product',
      product:null
    })
  });
  
}

else{
  res.render("productDetails", { product,user })
}

} catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).send("Server Error");
  }
};

// Forgot Password




const getForgotpassword =async(req,res)=>{
  try {
    res.render('forgotPassword')
  } catch (error) {
    res.redirect('/pageNotFound')
  }
}


const forgotEmailValid = async (req,res)=>{
try {
  const {email} = req.body;
  const findUser = await User.findOne({email:email})
  if(findUser){
    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email,otp)
    if(emailSent){
      req.session.userOtp = otp
      req.session.email = email
      res.render('forgotPass-otp')
      console.log('OTP:',otp);
      
    }else{
      res.json({success:false,message:'failde to send otp, pleace try again'})
    }

  }else{
    res.render('forgotPassword')
    message:'User with this email does not exist'
  }
  
} catch (error) {
  res.redirect('/pageNotFound')
  console.log(error);
  
}
}

const verifyForgotPassOtp = async(req,res)=>{
  try {
    const enterdOtp = req.body.otp;
    if(enterdOtp === req.session.userOtp){
      res.json({success:true,redirectUrl:'/reset-password'})
    }else{
      res.json({
        success:false,message:'OTP not maching'
      })
    }

  } catch (error) {
    res.status(500).json({success:false,message:'An error occure pleace try again'})
    console.log(error);
    
  }
}


const getResetPassPage = async(req,res)=>{
  try {
    res.render('reset-password')
  } catch (error) {
    res.redirect('/pageNotFound')
    console.log(error);
    
  }
}


const resendOtp = async(req,res)=>{
  try {
    const otp = generateOtp()
    req.session.userOtp = otp
    const email = req.session.email;
    console.log('resending otp to email',email);
    const emailSent = await sendVerificationEmail(email,otp)
    if(emailSent){
      console.log("otp:",otp);
      res.status(200).json({success:true,message:'Resend OTP Successfuly'})
      
    }
    
  } catch (error) {
    console.error('error in resend otp',error);
    res.status(500).json({success:false,message:'internal server error'})
  }
}



const postNewPassword = async(req,res)=>{
  try {
    const {newPass1, newPass2} = req.body;
    const email = req.session.email;
    if(newPass1 === newPass2){
      const passwordHash = await securePassword(newPass1)
      await User.updateOne(
        {email:email},
        {$set:{password:passwordHash}}
      )
      res.redirect('/login')
    }else{
      res.render('reset-password',{message:'passwords not mach'})
    }
  } catch (error) {
    res.redirect('/pageNotFound')
    console.log(error);
    
  }
}

module.exports = {
  getProducts,
  getProductDetails,


  getForgotpassword,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword
  
};