const Address = require("../../models/addressSchema");

const getAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");
    }

    const addressData = await Address.findOne({ userId });
    const user = req.user;

    res.render("address", {
      user: req.user,
      addresses: addressData ? addressData.address : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const addAddress = async (req, res) => {
  const { addressType, name, city, state, pincode, phone, altphone } = req.body;
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
    const userId = req.session.user;
    const addressId = req.params.addressId;
    const addressData = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    );

    res.render("editAddress", {
      address: addressData.address[0],
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const editAddress = async (req, res) => {
  const { addressType, name, city, state, pincode, phone, altphone } = req.body;
  const addressId = req.params.addressId;

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
