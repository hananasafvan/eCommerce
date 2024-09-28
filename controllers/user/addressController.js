const Address = require("../../models/addressSchema");
const User = require('../../models/userSchema')

const getAddress = async (req, res) => {
  try {
    const userId = req.session.user || req.user
    if (!userId) {
      return res.redirect("/login");
    }

    const addressData = await Address.findOne({ userId });
    //const user = req.user;
    let userData = userId ? await User.findById(userId) : null;
        res.locals.user = userData;
    res.render("address", {
      user: userData,
      addresses: addressData ? addressData.address : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const addAddress = async (req, res) => {
  const { addressType, name, city, state, pincode, phone, altphone } = req.body;
  
  // Server-side validation
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
    if (!userId) {
      return res.redirect("/login");
    }

    let addressData = await Address.findOne({ userId });

    if (!addressData) {
      addressData = new Address({ userId, address: [] });
    }

    addressData.address.push({
      addressType,
      name,
      city,
      state,
      pincode,
      phone,
      altphone,
    });

    await addressData.save();
    res.redirect("/address");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressId = req.params.addressId;

    await Address.updateOne(
      { userId },
      { $pull: { address: { _id: addressId } } }
    );

    res.redirect("/address");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getEditAddress = async (req, res) => {
  try {
    const userId = req.session.user || req.user
    const addressId = req.params.addressId;
    const addressData = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    );
    let userData = userId ? await User.findById(userId) : null;
    res.locals.user = userData;
    res.render("editAddress", {
      user: userData,
      address: addressData.address[0],
      //user: req.user,

    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const editAddress = async (req, res) => {
  const { addressType, name, city, state, pincode, phone, altphone } = req.body;
  const addressId = req.params.addressId;

  // Server-side validation
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

    await Address.updateOne(
      { userId, "address._id": addressId },
      {
        $set: {
          "address.$.addressType": addressType,
          "address.$.name": name,
          "address.$.city": city,
          "address.$.state": state,
          "address.$.pincode": pincode,
          "address.$.phone": phone,
          "address.$.altphone": altphone,
        },
      }
    );

    res.redirect("/address");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


module.exports = {
  getAddress,
  addAddress,
  deleteAddress,
  getEditAddress,
  editAddress,
};
