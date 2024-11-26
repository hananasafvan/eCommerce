const mongoose = require("mongoose");
const Product = require("../../models/productShema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
//const { size } = require("pdfkit/js/page");

const addproductInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const productData = await Product.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const categoryData = await Category.find({});
    const brandData = await Brand.find({});
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    res.render("product-add", {
      pro: productData,
      cat: categoryData,
      brand: brandData,
      currentPage: page,
      totalPages: totalPages,
      totalProducts: totalProducts,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const prodectExist = await Product.findOne({
      productName: products.productName,
    });
    if (!prodectExist) {
      const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;
          const resizedImagePath = path.join(
            "public",
            "uploads",
            "product-imgs",
            `resized-${req.files[i].filename}`
          );

          await sharp(originalImagePath)
            .resize({
              width: 440,
              height: 440,
              fit: sharp.fit.cover,
              position: sharp.strategy.entropy,
            })
            .toFile(resizedImagePath);
          images.push(`resized-${req.files[i].filename}`);
        }
      }

      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
        return res.status(400).json("invalid category name");
      }

      const stockSizes = [
        { size: "S", quantity: parseInt(req.body.s1, 10) },
        { size: "M", quantity: parseInt(req.body.s2, 10) },
        { size: "L", quantity: parseInt(req.body.s3, 10) },
        { size: "XL", quantity: parseInt(req.body.s4, 10) },
        { size: "XXL", quantity: parseInt(req.body.s5, 10) },
      ];

      const totalQuantity = stockSizes.reduce(
        (acc, size) => acc + size.quantity,
        0
      );

      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brand,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdOn: new Date(),
        quantity: totalQuantity,
        size: products.size,
        color: products.color,
        productImage: images,
        status: products.quantity <= 0 ? "note available" : "Available",
        intproductOffer: 0,
        stock: stockSizes,
      });

      await newProduct.save();
      return res.redirect("/admin/addProducts");
    } else {
      return res.status(400).json("product alredy exist");
    }
  } catch (error) {
    console.error("error saving problem", error);
    res.redirect("/admin/pageerror");
  }
};

const productInfo = async (req, res) => {
  try {
    const search = req.query.search || "";

    const page = req.query.page || 1;
    const limit = 20;

    const productData = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    //.exec(): Executes the query and returns a promise. This method is used to run the query and get the results.

    const count = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("product", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.log(error);
    res.redirect("/pageerror");
  }
};

const blockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send("Invalid product ID");
    }

    const product = await Product.findOne({ _id: id }).populate("stock");
    const category = await Category.find({});
    const brand = await Brand.find({});

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("edit-product", {
      product: product,
      cat: category,
      brand: brand,
      selectedCategory: product.category.toString(),
    });
    console.log("Selected Category ID:", product.category.toString());
  } catch (error) {
    console.log(error);
    res.redirect("/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const data = req.body;

    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({ error: "Product already exists" });
    }

    const stockSizes = [
      { size: "S", quantity: parseInt(req.body.s1, 10) },
      { size: "M", quantity: parseInt(req.body.s2, 10) },
      { size: "L", quantity: parseInt(req.body.s3, 10) },
      { size: "XL", quantity: parseInt(req.body.s4, 10) },
      { size: "XXL", quantity: parseInt(req.body.s5, 10) },
    ];

    const totalQuantity = stockSizes.reduce(
      (acc, size) => acc + size.quantity,
      0
    );

    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: data.category,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: totalQuantity,
      size: data.size,
      color: data.color,
      stock: stockSizes,
    };

    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
      updateFields.$push = { productImage: { $each: images } };
    }

    if (data.quantity <= 0) {
      updateFields.status = "not available";
    } else {
      updateFields.status = "Available";
    }

    await Product.findByIdAndUpdate(id, updateFields, { new: true });
    console.log("Product updated:", updateFields);

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error updating product:", error);
    res.redirect("/pageerror");
  }
};

const deletSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    const imagePath = path.join(
      "public",
      "uploads",
      "product-imgs",
      imageNameToServer
    );
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log(`image ${imageNameToServer}deleted successfully`);
    } else {
      console.log("image note found");
    }
    res.send({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addproductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });

    if (findCategory.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "this prodect categry alredy has offer",
      });
    }
    findProduct.salePrice =
      findProduct.salePrice -
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();
    res.json({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const removeproductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const percentage = findProduct.productOffer;
    findProduct.salePrice =
      findProduct.salePrice +
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = 0;
    await findProduct.save();
    res.json({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

module.exports = {
  addproductInfo,
  addProducts,
  productInfo,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deletSingleImage,
  addproductOffer,
  removeproductOffer,
};
