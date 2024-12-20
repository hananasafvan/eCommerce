const Brand = require("../../models/brandSchema");

const brandInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    res.render("brand", {
      brand: brandData,
      currentPage: page,
      totalPages: totalPages,
      totalBrands: totalBrands,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const addBrand = async (req, res) => {
  const { name } = req.body;

  try {
    console.log("Adding brand:", req.body);

    // Check if the brand already exists (case-insensitive)
    const existingBrand = await Brand.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (existingBrand) {
      return res.status(400).json({ error: "Brand already exists" });
    }

    // Create a new brand
    const newBrand = new Brand({ name });
    await newBrand.save();
    return res.json({ message: "Brand added successfully" });
  } catch (error) {
    console.error("Error adding brand:", error);

    return res.status(500).json({ error: "Internal server error" });
  }
};

const getEditBrand = async (req, res) => {
  try {
    const id = req.query.id;

    const brand = await Brand.findOne({ _id: id });
    if (brand) {
      res.render("edit-brand", { brand: brand });
    } else {
      res.redirect("/pageerror");
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const editBrand = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Updating brand:", req.body);

    const { brandname } = req.body;

    const existingBrand = await Brand.findOne({ name: brandname });
    if (existingBrand && existingBrand._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "Brand already exists, please choose another name" });
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
      id,
      {
        $set: { name: brandname },
      },
      { new: true }
    );
    console.log(brandname);

    if (updatedBrand) {
      res.redirect("/admin/brands");
    } else {
      res.status(404).json({ error: "Brand not found" });
    }
  } catch (error) {
    console.error("Error updating brand:", error);

    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const id = req.params.id;
    const brand = await Brand.findByIdAndDelete(id);

    if (brand) {
      res.redirect("/admin/brands");
    } else {
      res.status(404).json({ error: "Brand not found" });
    }
  } catch (error) {
    console.error("Error deleting brand:", error);

    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  brandInfo,
  addBrand,
  getEditBrand,
  editBrand,
  deleteBrand,
};
