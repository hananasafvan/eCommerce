//const { render } = require('ejs');
const Coupon = require('../../models/couponSchema')

const getCoupon = async (req,res)=> {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
    
        const couponData = await Coupon.find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
    
        const totalCoupon = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupon / limit);
        res.render("couponTable", {
          cop: couponData,
          currentPage: page,
          totalPages: totalPages,
          totalCoupon: totalCoupon,
        });
      } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
      }
}

const getAddCoupon = async (req,res)=>{
    try {
        
        res.render('addCoupon');
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
}
const postAddCoupon =async (req,res)=>{
  console.log('hello coupon');
  const {code, description, discountType, startDate, endDate, discountValue, minPurchase, maxPurchase, usageLimit,count} = req.body
    console.log('req.body of coupon',code, description, discountType, startDate, endDate, discountValue, minPurchase, maxPurchase, usageLimit);
    
  try {
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ error: 'Coupon already exists' });
    }
    
    const newCoupon = new Coupon({
      code,
      description,
      discountType,
      startDate,
      endDate,
      discountValue,
      minPurchase,
      maxPurchase,
      usageLimit,
      status:'Active',
      count:0 ,

    })
    await newCoupon.save()

    const currentDate = new Date().getTime()
    if(currentDate > newCoupon.endDate){
      newCoupon.status = 'Expired';
      await newCoupon.save();
    }
     res.json({ message: "Coupon added successfully." });
  
    
  } catch (error) {
    console.error('Error adding coupon:', error);
      
  }
}


module.exports={
    getCoupon,
    getAddCoupon,
    postAddCoupon,
}