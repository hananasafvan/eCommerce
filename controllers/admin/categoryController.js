const Category = require("../../models/categorySchema");

const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const addCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    // Log the incoming data
    console.log("Adding category:", req.body);

    // Check if the category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    // Create a new category
    const newCategory = new Category({ name, description });
    await newCategory.save();
    return res.json({ message: "category added succsesfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;

    const category = await Category.findOne({ _id: id });
    if (category) {
      res.render("edit-category", { category: category });
    } else {
      res.redirect("/pageerror");
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const editCategory = async (req, res) => {
  try {
    const id = req.params.id; // Use params if ID is passed in the route
    console.log("Updating category:", req.body);

    const { categoryname, description } = req.body;

    // Check if the category name already exists
    const existingCategory = await Category.findOne({ name: categoryname });
    if (existingCategory && existingCategory._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "Category already exists, please choose another name" });
    }

    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        $set: { name: categoryname, description: description },
      },
      { new: true }
    );
    console.log(categoryname);

    console.log(description);

    if (updatedCategory) {
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const category = await Category.findByIdAndDelete(id);

    if (category) {
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getListCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getUnlistCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  getEditCategory,
  editCategory,
  deleteCategory,
  getListCategory,
  getUnlistCategory,
};