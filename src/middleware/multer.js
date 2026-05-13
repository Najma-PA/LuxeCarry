const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

//file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
  }
};

//limit
const limits = {
  fileSize: 10 * 1024 * 1024,
  files: 50,
  fields: 500,
};

//EXPORT MULTER
const upload = multer({
  storage,
  fileFilter,
  limits,
});

// Helper to handle multer errors in routes
const handleMulterError = (uploadMethod) => {
  return (req, res, next) => {
    uploadMethod(req, res, (err) => {
      if (err) {
        let message = err.message;
        if (err.code === 'LIMIT_FILE_SIZE') {
          message = 'File size is too large (max 10MB)';
        }
        return res.status(400).json({
          success: false,
          message: message + (err.field ? ` (${err.field})` : ''),
        });
      }
      next();
    });
  };
};

module.exports = {
  upload,
  handleMulterError,
};
