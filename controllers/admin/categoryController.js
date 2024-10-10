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
    console.log("Adding category:", req.body);

    // Validate category name (only alphabets)
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return res.status(400).json({ error: "Please enter a valid category name (alphabets only)." });
    }

    // Validate description (only alphabets)
    if (!/^[a-zA-Z\s]+$/.test(description)) {
      return res.status(400).json({ error: "Please enter a valid description (alphabets only)." });
    }

    // Check if category already exists (case-sensitive)
    const existingCategory = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists." });
    }

    // Create a new category
    const newCategory = new Category({ name, description });
    await newCategory.save();
    return res.json({ message: "Category added successfully." });
  } catch (error) {
    console.error("Error adding category:", error);
    return res.status(500).json({ error: "Internal server error." });
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
    const id = req.params.id;
    console.log("Updating category:", req.body);

    const { categoryname, description } = req.body;
    if (!/^[a-zA-Z\s]+$/.test(categoryname)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid category name (alphabets only)." });
    }

    const existingCategory = await Category.findOne({ name: new RegExp(`^${categoryname}$`, 'i') });
    if (existingCategory && existingCategory._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "Category already exists, please choose another name" });
    }
    
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
