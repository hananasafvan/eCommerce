const mongoose = require("mongoose");

const {Schema} = mongoose;

const couponSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    createdOn : {
        type : Date,
        default : Date.now,
        requried : true
    },
    expireOn : {
        type : Date,
        required : true
    },
    offerPrice : {
        type : Number,
        required : true
    },
    minimumPrice : { //product offer allow abou this price
        type : Number,
        required : true
    },
    isList : {
        type : Boolean,
        default : true
    },
    userId : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User'
    }]
})

const Coupon = mongoose.model("Coupon",couponSchema);

module.exports = Coupon;