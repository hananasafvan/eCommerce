const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const userSchema = new Schema({
    userId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: false,
        //unique: true
        sparse:true
    },
    phone: {
        type: String,
        required: false,
        unique:true,
        sparse:true,
        default: null
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        //required: false
    },
    password: {
        type: String, 
        required: false
    },
    
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    role: {
        type: Number,
        enum: [0,1, 2],
        default:0,
        required:false
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    referralCode: {
        type: String,
        required: false
    },
    redeemed: {
        type: Boolean
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }],
    address:[
        {type:Schema.Types.ObjectId,
            ref:'Address'
        }
    ],
    walletBalance: {
        type: Number,
        default: 0
      },
});

const User = mongoose.model("User", userSchema);
module.exports = User;