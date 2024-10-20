const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const { unlock } = require('../../routes/adminOrderRouter');


const showWallet = async (req, res) => {
    // Access userId from session
    const userId = req.session.user || req.user;
  console.log('showwallet',userId);
  
    try {
      // Fetch the user by their ID from the session
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send("User not found");
      }
  
      // Render the wallet view with wallet balance and user data
      res.render('wallet', { walletBalance: user.walletBalance, user });
    } catch (error) {
      console.error("Error displaying wallet:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  

  const updateWallet = async (req, res) => {
    // Access userId from session
    const userId = req.session.user || req.user;
  
    console.log('user id wallet', userId);
  
    if (!userId) {
      return res.status(401).send("Unauthorized: User not logged in");
    }
  
    try {
      // Fetch the user by their ID
      const user = await User.findById(userId);
      console.log(user);
  
      if (!user) {
        return res.status(404).send("User not found");
      }
  
      // Amount to be added to the wallet
      const { amount } = req.body;
      if (!amount) {
        return res.status(400).send("Invalid amount");
      }
  
      // Update user's wallet balance
      user.walletBalance += amount;
      console.log(`Updated wallet balance for user ${user._id}: New Balance ${user.walletBalance}`);
      await user.save();
  
      res.status(200).json({ message: "Wallet updated successfully", newBalance: user.walletBalance });
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  
module.exports = {
  showWallet,
  updateWallet,
};
