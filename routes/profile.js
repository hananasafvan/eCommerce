const express = require("express");
const router = express.Router();
const addressController = require("../controllers/user/addressController");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");


const { userAuth } = require("../middleweares/auth");

router.get("/userProfile", userAuth, profileController.getProfile);
router.get("/user/editUser", userAuth, profileController.getEditUser);
router.post("/user/editUser/:id", userAuth, profileController.postEditUser);

router.get('/user/changePassword',userAuth,profileController.getChangepassword);
router.post('/user/changePassword', userAuth, profileController.postChangePassword);


router.post("/cart/add", userAuth, cartController.addToCart);
router.post('/cart/addWish',cartController.addToCartWish);
router.get("/cart", userAuth, cartController.getCart);
router.get("/cart/remove/:productId", userAuth, cartController.removeFromCart);
router.post("/cart/update-quantity",userAuth,cartController.updateQuantity);

router.post("/wishlist/add", userAuth,cartController.addToWishlist);
router.get('/wishlist',userAuth,cartController.getWishlist)
router.get('/wishlist/remove/:productId',cartController.removeFromWishlist);

router.get("/address", userAuth, addressController.getAddress);
router.post("/addAddress", userAuth, addressController.addAddress);
router.post(
  "/address/edit/:addressId",
  userAuth,
  addressController.editAddress
);
router.get(
  "/address/edit/:addressId",
  userAuth,
  addressController.getEditAddress
);
router.post(
  "/address/delete/:addressId",
  userAuth,
  addressController.deleteAddress
);

module.exports = router;
