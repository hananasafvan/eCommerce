const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  startDate: { type: Date, default: moment().toDate(), required: true },
  endDate: {
    type: Date,
    default: moment().add(7, "days").toDate(),
    required: true,
  }, // For example, add 7 days for end date
  discountValue: { type: Number, required: true },
  minPurchase: { type: Number, default: 0 },
  maxPurchase: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 0 },
  status: { type: String, default: "existing" },
  createdAt: { type: Date, default: Date.now },
  count: { type: Number, default: 0 },
  redeemedUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
  ],
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
