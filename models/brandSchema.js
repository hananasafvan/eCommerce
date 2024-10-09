const mongoose = require("mongoose");
const {Schema} = mongoose;


const brandSchema = new Schema({

    name : {
        type : String,
        required : true,
        unique: true ,
        sparse: true

    },
    // brandImage : {
    //     type : [String],
    //     required : true
    // },
    isBlocked : {
        type : Boolean,
        default : false
    },
    createdAt : {
        type : Date,
        default : Date.now
    },isListed : { 
                type : Boolean,
        default : true
    },

})

const Brand = mongoose.model("Brand",brandSchema);
module.exports = Brand;