const cartService = require('../services/cartService');

exports.getCart = async (req, res) => {
  try {
    const cart = await cartService.getCart(req.user._id);

    res.render('user/cart', { cart });

  } catch (err) {
    res.send(err.message);
  }
};

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const result = await cartService.addToCart(req.user._id, req.params.id);

    res.json(result);

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// Update quantity
exports.updateQuantity = async (req, res) => {
  try {
    const result = await cartService.updateQuantity(
      req.user._id,
      req.params.id,
      req.query.change
    );

    res.json(result);

  } catch (err) {
    res.json({ success: false });
  }
};

// Remove item
exports.removeItem = async (req, res) => {
  try {
    await cartService.removeItem(req.user._id, req.params.id);

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false });
  }
};