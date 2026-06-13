const mongoose = require('mongoose');

/**
 * Validates if the given ID(s) is a valid Mongoose ObjectId.
 * Supports checking a single ID or multiple IDs.
 *
 * @param {...string} ids - The ID(s) to validate
 * @returns {boolean} - Returns true if all IDs are valid, false otherwise
 */
const isValidObjectId = (...ids) => {
  return ids.every((id) => mongoose.Types.ObjectId.isValid(id));
};

module.exports = {
  isValidObjectId,
};
