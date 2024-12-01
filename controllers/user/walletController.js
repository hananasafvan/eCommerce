const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const { unlock } = require("../../routes/adminOrderRouter");

const showWallet = async (req, res) => {
  const userId = req.session.user || req.user;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    
    const walletTransactions = user.walletTransactions.sort((a, b) => b.date - a.date);
    
    const userData = await User.findById(userId);
    res.locals.user = userData;

    res.render("wallet", {
      walletBalance: user.walletBalance,
      walletTransactions: walletTransactions,
      user: userData,
    });
    console.log("wallet transactions", walletTransactions);
  } catch (error) {
    console.error("Error displaying wallet:", error);
    res.redirect('/pageNotFound')
  }
};

const updateWallet = async (req, res) => {
  const userId = req.session.user || req.user;

  console.log("user id wallet", userId);

  if (!userId) {
    return res.status(401).send("Unauthorized: User not logged in");
  }

  try {
    const user = await User.findById(userId);
    console.log(user);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const { amount } = req.body;
    if (!amount) {
      return res.status(400).send("Invalid amount");
    }

    user.walletBalance += amount;
    console.log(
      `Updated wallet balance for user ${user._id}: New Balance ${user.walletBalance}`
    );
    await user.save();

    res
      .status(200)
      .json({
        message: "Wallet updated successfully",
        newBalance: user.walletBalance,
      });
  } catch (error) {
    console.error("Error updating wallet:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  showWallet,
  updateWallet,
};
