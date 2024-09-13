const multer = require("multer");
const path = require("path");

//for storing uploding imgs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/re-img"); // the directory where you want to save the files
  },
  //set unique name for stored files
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});
const uploads = multer({ storage: storage });

module.exports = storage;
