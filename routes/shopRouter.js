const express = require("express");
const router = express.Router();
const { getShop } = require("../controllers/user/shopController");

router.get("/", getShop);

module.exports = router;
