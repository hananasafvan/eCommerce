const Coupon = require("../../models/couponSchema");

const getCoupon = async (req, res) => {
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
};

const getAddCoupon = async (req, res) => {
  try {
    res.render("addCoupon");
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};
const postAddCoupon = async (req, res) => {
  console.log("hello coupon");
  const {
    code,
    description,
    discountType,
    startDate,
    endDate,
    discountValue,
    minPurchase,
    maxPurchase,
    usageLimit,
    count,
  } = req.body;
  console.log(
    "req.body of coupon",
    code,
    description,
    discountType,
    startDate,
    endDate,
    discountValue,
    minPurchase,
    maxPurchase,
    usageLimit
  );

  try {
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ error: "Coupon already exists" });
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
      status: "Active",
      count: 0,
    });
    await newCoupon.save();

    const currentDate = new Date().getTime();
    if (currentDate > newCoupon.endDate) {
      newCoupon.status = "Expired";
      await newCoupon.save();
    }
    res.json({ message: "Coupon added successfully." });
  } catch (error) {
    console.error("Error adding coupon:", error);
  }
};
const getEditCoupon = async (req, res) => {
  try {
    const id = req.query.id;
    console.log("coupon id", id);

    const coupon = await Coupon.findOne({ _id: id });
    if (coupon) {
      res.render("edit-coupon", { coupon: coupon });
    } else {
      res.redirect("/pageerror");
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const editCoupon = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Updating coupon:", id);
    const {
      code,
      description,
      discountType,
      startDate,
      endDate,
      discountValue,
      minPurchase,
      maxPurchase,
      usageLimit,
      count,
    } = req.body;

    if (!/^[a-zA-Z0-9%$&@#\-_]+$/.test(code)) {
      return res
        .status(400)
        .json({
          error:
            "Please enter a valid coupon code (letters, numbers, and special characters like %$&@#-_).",
        });
    }

    if (!/^[a-zA-Z0-9\s.,!%$&@#\-_]+$/.test(description)) {
      return res
        .status(400)
        .json({
          error:
            "Please enter a valid description (letters, numbers, spaces, and common characters).",
        });
    }

    if (!/^\d+(\.\d+)?$/.test(discountValue)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid discount value (numbers only)." });
    }

    if (minPurchase && !/^\d+(\.\d+)?$/.test(minPurchase)) {
      return res
        .status(400)
        .json({
          error: "Please enter a valid minimum purchase amount (numbers only).",
        });
    }

    if (maxPurchase && !/^\d+(\.\d+)?$/.test(maxPurchase)) {
      return res
        .status(400)
        .json({
          error: "Please enter a valid maximum purchase amount (numbers only).",
        });
    }

    if (usageLimit && !/^\d+$/.test(usageLimit)) {
      return res
        .status(400)
        .json({
          error: "Please enter a valid usage limit (whole numbers only).",
        });
    }

    const existingCoupon = await Coupon.findOne({
      code: new RegExp(`^${code}$`, "i"),
    });
    if (existingCoupon && existingCoupon._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "Coupon already exists, please choose another name" });
    }

    const updatedCoupoin = await Coupon.findByIdAndUpdate(
      id,
      {
        $set: {
          code: code,
          description: description,
          discountType: discountType,
          startDate: startDate,
          endDate: endDate,
          discountValue: discountValue,
          minPurchase: minPurchase,
          maxPurchase: maxPurchase,
          usageLimit: usageLimit,
          count: count,
        },
      },
      { new: true }
    );
    if (updatedCoupoin) {
      res.json({ message: "Coupon edit successfully." });
    } else {
      res.status(404).json({ error: "Coupon not found" });
    }
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`Deleting coupon with ID: ${id}`);

    const deletedCoupon = await Coupon.findByIdAndDelete(id);
    if (deletedCoupon) {
      return res.json({ success: true });
    } else {
      return res
        .status(404)
        .json({ success: false, error: "Coupon not found" });
    }
  } catch (error) {
    console.error("Error deleting coupon:", error);

    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

module.exports = {
  getCoupon,
  getAddCoupon,
  postAddCoupon,
  getEditCoupon,
  editCoupon,
  deleteCoupon,
};
