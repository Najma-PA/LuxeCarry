const Wishlist = require('../models/wishlistModel');
const Product = require('../models/productModel');

const getWishlist = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'category' }
  });
  if (!wishlist) {
    return { items: [] };
  }
  return wishlist;
};

const toggleWishlist = async (userId, productId) => {
  let wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, items: [] });
  }

  const existingIdx = wishlist.items.findIndex(item => item.product.toString() === productId);

  if (existingIdx > -1) {
    // Remove if exists
    wishlist.items.splice(existingIdx, 1);
    await wishlist.save();
    return { success: true, action: 'removed', message: 'Removed from wishlist' };
  } else {
    // Add if not exists
    wishlist.items.push({ product: productId });
    await wishlist.save();
    return { success: true, action: 'added', message: 'Added to wishlist' };
  }
};

const removeFromWishlist = async (userId, productId) => {
  return await Wishlist.updateOne(
    { user: userId },
    { $pull: { items: { product: productId } } }
  );
};

module.exports = {
  getWishlist,
  toggleWishlist,
  removeFromWishlist
};
