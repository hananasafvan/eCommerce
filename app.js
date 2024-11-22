const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
const db = require("./config/db");
const userRouter = require("./routes/userRouter");
const { log } = require("console");
const adminRouter = require("./routes/adminRouter");
const productRouter = require("./routes/productRouter");
const orderRouter = require("./routes/orderRouter");
const profile = require("./routes/profile");
const adminOrderRouter = require("./routes/adminOrderRouter");


db();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
]);
app.use(express.static(path.join(__dirname, "public")));





app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/", productRouter);
app.use("/", profile);
app.use("/order", orderRouter);
app.use("/admin", adminOrderRouter);





//app.set("view cache", false);

const PORT = 3000 || process.env.PORT;
app.listen(PORT, () => {
  console.log("server running");
  module.exports = app;
});


// admin@gmail.com
//admin123

//git status
//git add --all
//git commit -m "message"
//git push

// KEY ID rzp_test_kPNgq4T5ArRlHs
//SECRET KEY X1qoflIJTJxlFfE8Xaq7o72L


//Sandbox URL  https://sandbox.paypal.com
//Email   sb-0c3u933611484@business.example.com
//Password  i_dlR0[H

//user seller clid id AaLyFKbmDeTVKKKXxY9V9b4S2AfKOEOse3d0ngrTwtuGceYq07ppBeEGA5R1GYgJp4zZvD0ID8KuH6vM
//user secret id   EAi3oHELfJVTuy7yVvMjQu1t24iM2tA0CxFsNDbxqkV27VGkte2mtfSeEZ4hRM9hEd_vqfvWOSYPKSpH
//user email   sb-7xltq33620090@personal.example.com
// user password  %5$lvl0R

// user usd email sb-c3wsi33648146@personal.example.com
//user usd password vQyjc^I8