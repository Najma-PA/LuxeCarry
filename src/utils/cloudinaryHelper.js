const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Uploads a buffer to Cloudinary using a stream
 * @param {Buffer} buffer - The image buffer from multer
 * @param {String} folder - Cloudinary folder name (e.g., 'products', 'categories')
 * @returns {Promise} - Cloudinary upload result
 */
const uploadStream = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `LuxeCarry/${folder}`,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Deletes an image from Cloudinary by public_id
 * @param {String} public_id - The public_id of the image
 * @returns {Promise}
 */
const deleteImage = async (public_id) => {
  if (!public_id) return;
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
  }
};

module.exports = {
  uploadStream,
  deleteImage,
};
