const wishlistService = require('../../services/user/wishlistService');

exports.showWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.getWishlist(req.user._id);
    res.render('user/wishlist', { wishlist });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Please log in to continue' });
    }
    const { productId } = req.body;
    const result = await wishlistService.toggleWishlist(req.session.user.id, productId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeItem = async (req, res) => {
  try {
    const { productId } = req.params;
    await wishlistService.removeFromWishlist(req.user._id, productId);
    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
