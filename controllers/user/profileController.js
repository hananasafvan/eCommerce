const User = require("../../models/userSchema");

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
    console.log("profile updating ", req.body);
    const { name, email, phone } = req.body;

    const existingProfile = await User.findOne({ name: name });
    if (existingProfile && existingProfile._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "user already exists, please choose another name" });
    }
    const updateProfile = await User.findByIdAndUpdate(
      id,
      {
        //$set: { name: name, email: email, phone: phone },
        $set: { name, email, phone },
      },
      {
        new: true,
      }
    );

    console.log(name);

    console.log(email);

    console.log(phone);
    if (updateProfile) {
      // req.session.user = updateProfile._id; // Update session to new user ID or info
      // req.session.save();

      res.redirect("/userprofile");
      console.log("Profile updated");
    } else {
      res.status(404).json({ error: "Category not found" });
      console.log("user cand update");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
module.exports = {
  getProfile,
  getEditUser,
  postEditUser,
};
