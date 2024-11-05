const User = require("../../models/userSchema");
const session = require("express-session");
const bcrypt = require("bcrypt");


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
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.render("editUser", {
        user: req.body,
        error: "All fields are required.",
      });
    }

    const existingProfile = await User.findOne({ name });
    if (existingProfile && existingProfile._id.toString() !== id) {
      return res.render("editUser", {
        user: req.body,
        error: "User already exists, please choose another name.",
      });
    }

    const updateProfile = await User.findByIdAndUpdate(
      id,
      { $set: { name, phone } },
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
const getChangepassword = async (req,res)=>{
  try {
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.status(401).send("User not logged in");
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).send("User not found");
    }

const password = user.password;
console.log('change password password',password);
const userData = await User.findById(userId);
    res.locals.user = userData;

    return res.render("changePassword", { userId: user._id });
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
}



const postChangePassword = async (req, res) => {
  try {
    const userId = req.session.user;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).send("User not logged in");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Check if the old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).send("Old password is incorrect");
    }

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.send("Password updated successfully");
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while updating the password");
  }
};



module.exports = {
  getProfile,
  getEditUser,
  postEditUser,
  getChangepassword,
  postChangePassword
};
