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
    const result = await cartService.addToCart(
      req.user._id, 
      req.params.id, 
      req.query.variantId,
      req.query.qty
    );

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
    res.json({ success: false, message: err.message });
  }
};

// Remove item
exports.removeItem = async (req, res) => {
  try {
    const updatedCart = await cartService.removeItem(req.user._id, req.params.id);
    const cartCount = await cartService.getCartCount(req.user._id);

    res.json({ 
      success: true,
      cartSubtotal: updatedCart.subtotal,
      cartDiscount: updatedCart.totalDiscount,
      cartTotal: updatedCart.total,
      itemCount: updatedCart.items.length,
      cartCount
    });

  } catch (err) {
    res.json({ success: false, message: err.message || "Could not remove item" });
  }
};

// Validate Cart
exports.validateCart = async (req, res) => {
  try {
    const result = await cartService.validateCart(req.user._id);
    res.json(result);
  } catch (err) {
    console.error('Validation Error:', err);
    res.status(500).json({ success: false, message: 'Could not validate cart' });
  }
};

// Get Cart Items Status (for real-time updates)
exports.getCartItemsStatus = async (req, res) => {
  try {
    const result = await cartService.getCartItemsStatus(req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false });
  }
};