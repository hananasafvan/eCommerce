const User = require("../../models/userSchema");
const session = require("express-session");

const getProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).send("User not logged in");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    return res.render("userprofile", { user: user });
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const getEditUser = async (req, res) => {
  try {
    const id = req.query.id;
    const user = await User.findOne({ _id: id });
    if (user) {
      res.render("editUser", { user: user });
      console.log("user exist");
    } else {
      res.redirect("/pageerror");
      console.log("user not Address.exists");
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const postEditUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { name,  phone } = req.body;

    // Validate input
    if (!name || !phone) {
      return res.render("editUser", {
        user: req.body,
        error: "All fields are required.",
      });
    }

    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(email)) {
    //   return res.render("editUser", {
    //     user: req.body,
    //     error: "Invalid email format.",
    //   });
    // }

    // Check for existing user with the same name
    const existingProfile = await User.findOne({ name });
    if (existingProfile && existingProfile._id.toString() !== id) {
      return res.render("editUser", {
        user: req.body,
        error: "User already exists, please choose another name.",
      });
    }

    const updateProfile = await User.findByIdAndUpdate(
      id,
      { $set: { name,  phone } },
      { new: true }
    );

    if (updateProfile) {
      res.render("editUser", {
        user: updateProfile,
        success: "Profile updated successfully.",
      });
    } else {
      res.render("editUser", {
        user: req.body,
        error: "User not found.",
      });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.render("editUser", {
      user: req.body,
      error: "Internal server error.",
    });
  }
};

module.exports = {
  getProfile,
  getEditUser,
  postEditUser,
};
