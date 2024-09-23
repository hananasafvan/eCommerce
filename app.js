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

app.set("view cache", false);

const PORT = 3000 || process.env.PORT;
app.listen(PORT, () => {
  console.log("server running");
  module.exports = app;
});


//git status
//