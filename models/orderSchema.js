const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
      status: { type: String, default: "Pending" },
      size: { type: String, required: true },
      itemId: {
        type: String,
        default: () => uuidv4().split("-")[0],
        required: true,
      },
      deliveredAt: { type: Date },
    },
  ],
  address: {
    name: {
      type: String,
      required: true,
      //unique:true
    },
    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    altphone: {
      type: String,
    },
  },
  
  paymentMethod: { type: String, required: true },
  orderStatus: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  totalOrderPrice: { type: Number, default: 0 },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    default: null,
  },
});

module.exports = mongoose.model("Order", orderSchema);
