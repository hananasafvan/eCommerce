const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");



const getAddress = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.redirect("/login");
    }
    let userData = userId
      ? await User.findById(userId).populate("address")
      : null;

    res.locals.user = userData;
    console.log("userdata", userData);

    const addressData = userData.address;
    console.log(addressData);

    res.render("address", {
      user: userData,
      addressData: addressData || [],
    });
  } catch (err) {
    console.error(err);
    res.redirect('/pageNotFound')
  }
};

const addAddress = async (req, res) => {
  const { name, city, state, pincode, phone, altphone } = req.body;

  if (!name || !city || !state || !pincode || !phone || !altphone) {
    return res.status(400).send("All fields are required.");
  }
  if (!/^[A-Za-z ]+$/.test(name)) {
    return res.status(400).send("Name must contain only alphabets.");
  }
  if (!/^[A-Za-z0-9 ]+$/.test(city)) {
    return res.status(400).send("City can contain only alphabets and numbers.");
  }
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).send("Pincode must be 6 digits.");
  }
  if (!/^\d{10}$/.test(phone) || !/^\d{10}$/.test(altphone)) {
    return res.status(400).send("Phone numbers must be 10 digits.");
  }

  try {
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.redirect("/login");
    }
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    let addressData = await Address.findOne({ userId });

    if (!addressData) {
      addressData = new Address({ userId, Address });
    }

    addressData = new Address({
      userId,
      name,
      city,
      state,
      pincode,
      phone,
      altphone,
    });

    await addressData.save();
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.address.push(addressData._id);
    await user.save();
    res.redirect("/address");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    console.log("userid delet address", userId);
    const addressId = req.params.addressId;

    const deletedAddress = await Address.findByIdAndDelete(addressId);

    if (!deletedAddress) {
      return res.status(404).send("Address not found.");
    }

    const user = await User.updateOne(
      { _id: userId },
      { $pull: { address: addressId } }
    );

    res.redirect("/address");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getEditAddress = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    let userData = userId
      ? await User.findById(userId).populate("address")
      : null;
    res.locals.user = userData;
    const addressId = req.params.addressId;
    const addressData = userData.address.find(
      (address) => address._id.toString() === addressId
    );

    res.render("editAddress", {
      user: userData,
      address: addressData,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/pageNotFound')
  }
};

const editAddress = async (req, res) => {
  const { name, city, state, pincode, phone, altphone } = req.body;
  const addressId = req.params.addressId;

  if (!name || !city || !state || !pincode || !phone || !altphone) {
    return res.status(400).send("All fields are required.");
  }
  if (!/^[A-Za-z ]+$/.test(name)) {
    return res.status(400).send("Name must contain only alphabets.");
  }
  if (!/^[A-Za-z0-9 ]+$/.test(city)) {
    return res.status(400).send("City can contain only alphabets and numbers.");
  }
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).send("Pincode must be 6 digits.");
  }
  if (!/^\d{10}$/.test(phone) || !/^\d{10}$/.test(altphone)) {
    return res.status(400).send("Phone numbers must be 10 digits.");
  }

  try {
    const userId = req.session.user;
    let userData = userId
      ? await User.findById(userId).populate("address")
      : null;
    res.locals.user = userData;
    console.log("editadd userdata", userData);

    const updateAddress = await Address.findByIdAndUpdate(
      addressId,
      { $set: { name, city, state, pincode, phone, altphone } },
      { new: true }
    );
    if (!updateAddress) {
      return res.status(404).send("Address not found");
    }

    res.redirect("/address");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const newAddress = async(req,res)=>{
  try {
    const userId = req.session.user || req.user;
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    res.render('newAddress')
  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound')
  }
}

const addNewAddress = async(req,res)=>{
  const { name, city, state, pincode, phone, altphone } = req.body;

  if (!name || !city || !state || !pincode || !phone || !altphone) {
    return res.status(400).send("All fields are required.");
  }
  if (!/^[A-Za-z ]+$/.test(name)) {
    return res.status(400).send("Name must contain only alphabets.");
  }
  if (!/^[A-Za-z0-9 ]+$/.test(city)) {
    return res.status(400).send("City can contain only alphabets and numbers.");
  }
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).send("Pincode must be 6 digits.");
  }
  if (!/^\d{10}$/.test(phone) || !/^\d{10}$/.test(altphone)) {
    return res.status(400).send("Phone numbers must be 10 digits.");
  }

  try {
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.redirect("/login");
    }
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    let addressData = await Address.findOne({ userId });

    if (!addressData) {
      addressData = new Address({ userId, Address });
    }

    addressData = new Address({
      userId,
      name,
      city,
      state,
      pincode,
      phone,
      altphone,
    });

    await addressData.save();
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.address.push(addressData._id);
    await user.save();
    res.redirect("/order/checkout");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}

module.exports = {
  getAddress,
  addAddress,
  deleteAddress,
  getEditAddress,
  editAddress,
  newAddress,
  addNewAddress,
};
