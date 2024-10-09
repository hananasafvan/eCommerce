
const mongoose = require("mongoose")
const {Schema} = mongoose;

const addressSchema = new mongoose.Schema({

                 userId:{
                    type: String, required: false
                 },
                 name : {
                    type : String,
                     required : false,
                    //unique:true
                },
                 city:{
                     type : String,
                     required : false
                 },
                 
                 state : {
                     type : String,
                     required : false
                 },
                 pincode : {
                    type : Number,
                 required : false
                 },
                 phone : {
                     type : String,
                     required : false
                 },
                 altphone : {
                     type : String,
                     required : false
                  
                 }
})

const Address = mongoose.model("Address", addressSchema);


module.exports = Address;


















// const mongoose = require('mongoose')
// const {Schema} = mongoose

// const addressSchema = new Schema({
//     userId : {
//         type : Schema.Types.ObjectId,
//         ref : 'User',
//         required : false
//     },
//     address : [{
        
//          name : {
//             type : String,
//             required : false,
//             //unique:true
//         },
//         city:{
//             type : String,
//             required : false
//         },
//         // landMark : {
//         //     type : String,
//         //     required : true
//         // },
//         state : {
//             type : String,
//             required : false
//         },
//         pincode : {
//             type : Number,
//             required : false
//         },
//         phone : {
//             type : String,
//             required : false
//         },
//         altphone : {
//             type : String,
//             required : false
            
//         }
//     }]
// })


// const Address = mongoose.model('Address', addressSchema)
// module.exports = Address