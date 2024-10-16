const mongoose = require("mongoose");

const {Schema} = mongoose;
const moment = require('moment')

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true},
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    startDate: { type: Date,default: moment().format("DD/MM/YYYY") + ";" + moment().format("hh:mm:ss"), required: true },
    endDate: { type: Date,default: moment().format("DD/MM/YYYY") + ";" + moment().format("hh:mm:ss"), required: true },
    discountValue: { type: Number, required: true },
    minPurchase: { type: Number, default: 0 },
    maxPurchase: { type: Number, default: 0 },
    usageLimit: { type: Number, default: 0 },
    status:{type:String,defalt:'existing'},
    count:{type:Number,defalt:0},
});
const Coupon = mongoose.model("Coupon",couponSchema);

module.exports = Coupon;
