const mongoose = require("mongoose");
const {Schema} = mongoose;


const productSchema = new Schema({
    productName : {
        type : String,
        required : true,
    },
    description : {
        type : String,
        required : true,
    },
    brand : {
        type : String,
        required : true,
    },
    category : {
        type : Schema.Types.ObjectId,
        ref : "Category",
        required : true,
    },
    regularPrice : {
        type : Number,
        required : true,
    },
    salePrice :{ 
        type : Number,
        required : true
    },
    productOffer : {
        type : Number,
        default : 0,
    },
    indproductOffer:{
        type : Number,
        default : 0,
    },
    quantity : {
        type : Number,
        default : 0
    },

    stock:[{
          size:{type:String,require:true},
          quantity:{type:Number,require:true}
    }],
    color : {
        type : String,
        required : true
    },
    productImage : {
        type : [String],
        required : true
    },
    isBlocked : {
        type : Boolean,
        default : false
    },
    status : {
        type : String,
        enum : ["Available","out of stock","Discountinued"],
        required : true,
        default : "Available"
    },
    popularity: {
        type: Number,
        default: 0,
    },
    rating: {
        type: Number,
        default: 0, 
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
},
{timestamps:true});  

const Product = mongoose.model("Product",productSchema);

module.exports = Product;