const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const Wishlist = require('../models/wishlistModel');

const MAX_QTY = 5;

//Get Cart
exports.getCart = async (userId) => {

  let cart = await Cart.findOne({ user: userId })
    .populate('items.product');

  if (!cart) {
    return { items: [], total: 0 };
  }

  // Remove inactive products automatically
  cart.items = cart.items.filter(i => i.product && i.product.isActive);

  let total = 0;

  cart.items.forEach(item => {
    total += item.product.price * item.quantity;
  });

  return {
    items: cart.items,
    total
  };
};



//Add to Cart

exports.addToCart = async (userId, productId) => {

  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw new Error('Product unavailable');
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existing = cart.items.find(i => i.product.equals(productId));

  if (existing) {

    if (existing.quantity < product.stock && existing.quantity < MAX_QTY) {
      existing.quantity++;
    }

  } else {

    cart.items.push({
      product: productId,
      quantity: 1
    });
  }

  await cart.save();

  //Remove from wishlist
  await Wishlist.updateOne(
    { user: userId },
    { $pull: { items: { product: productId } } }
  );

  return { success: true };
};


//Update Quantity

exports.updateQuantity = async (userId, itemId, change) => {

  const cart = await Cart.findOne({ user: userId })
    .populate('items.product');

  const item = cart.items.id(itemId);

  if (!item || !item.product) {
    return { success: false };
  }

  if (!item.product.isActive) {
    return { success: false, message: 'Product unavailable' };
  }

  change = parseInt(change);

  // Increase
  if (change === 1) {
    if (item.quantity < item.product.stock && item.quantity < MAX_QTY) {
      item.quantity++;
    }
  }

  // Decrease
  if (change === -1) {
    item.quantity--;
    if (item.quantity <= 0) {
      cart.items.pull(item._id);
    }
  }

  await cart.save();

  return { success: true };
};

// Remove Item

exports.removeItem = async (userId, itemId) => {

  const cart = await Cart.findOne({ user: userId });

  if (!cart) return;

  cart.items.pull(itemId);

  await cart.save();
};