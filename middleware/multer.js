const multer = require('multer');
const path = require('path');


// 📦 STORAGE CONFIG (temporary storage)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/temp'); // temp folder (important)
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1E9);

    cb(null, uniqueName + path.extname(file.originalname));
  }
});


// FILE FILTER (ONLY IMAGES)
const fileFilter = (req, file, cb) => {

  const allowedTypes = /jpeg|jpg|png|webp/;

  const ext = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (jpg, png, webp) are allowed'));
  }
};


// 📏 LIMITS
const limits = {
  fileSize: 10 * 1024 * 1024,
  files: 50,                  // Allow up to 50 files
  fields: 500                 // Allow up to 500 text fields (important for variants)
};


// 🚀 EXPORT MULTER
const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = upload;