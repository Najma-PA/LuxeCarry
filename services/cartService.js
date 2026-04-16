const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const Wishlist = require('../models/wishlistModel');

const MAX_QTY = 5;

//Get Cart
const getCart = async (userId) => {

  let cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      populate: { path: 'category' }
    });

  if (!cart) {
    return { items: [], total: 0, subtotal: 0, totalDiscount: 0 };
  }

  // Remove inactive products or blocked categories automatically
  cart.items = cart.items.filter(i => 
    i.product && 
    i.product.isActive && 
    i.product.category && 
    i.product.category.isActive
  );

  let subtotal = 0;
  let totalDiscount = 0;

  cart.items.forEach(item => {
    const originalPrice = item.product.price;
    const finalPrice = Math.round(originalPrice - (originalPrice * item.product.offer / 100));
    const discountAmount = originalPrice - finalPrice;

    subtotal += originalPrice * item.quantity;
    totalDiscount += discountAmount * item.quantity;
    
    // Attach details for premium UI
    item.finalPrice = finalPrice;
    item.itemTotal = finalPrice * item.quantity;

    // Attach variant info for the view
    if (item.variant && item.product.variants) {
      item.variantDetail = item.product.variants.id(item.variant);
    }
  });

  return {
    items: cart.items,
    subtotal,
    totalDiscount,
    total: subtotal - totalDiscount
  };
};

// Get Cart Count (Global Badge)
const getCartCount = async (userId) => {
  if (!userId) return 0;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
};



//Add to Cart

const addToCart = async (userId, productId, variantId, qty = 1) => {

  const product = await Product.findById(productId).populate('category');

  if (!product || !product.isActive) {
    throw new Error('Product is currently unlisted or unavailable');
  }

  if (!product.category || !product.category.isActive) {
    throw new Error('Product category is currently blocked or unavailable');
  }

  qty = parseInt(qty);
  if (isNaN(qty) || qty < 1) qty = 1;

  // If no variantId, try to pick first available as default
  if (!variantId && product.variants && product.variants.length > 0) {
    variantId = product.variants[0]._id;
  }

  // Find variant for stock check if applicable
  let selectedVariant = null;
  if (variantId && product.variants) {
    selectedVariant = product.variants.id(variantId);
  }

  const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

  if (availableStock <= 0) {
    throw new Error('Product is currently out of stock');
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  // Check if same product AND same variant already exists
  const existing = cart.items.find(i => 
    i.product.equals(productId) && 
    (variantId ? i.variant?.equals(variantId) : !i.variant)
  );

  if (existing) {
    const newQty = existing.quantity + qty;

    if (existing.quantity >= MAX_QTY) {
      throw new Error(`You can only add up to ${MAX_QTY} units of this item in total.`);
    }

    if (newQty > availableStock) {
      throw new Error(`Only ${availableStock} units available in stock. You already have ${existing.quantity} in cart.`);
    }

    if (newQty > MAX_QTY) {
      existing.quantity = MAX_QTY;
      await cart.save();
      return { 
        success: true, 
        message: `Quantity capped at ${MAX_QTY} units maximum.` 
      };
    }

    existing.quantity = newQty;

  } else {
    // New item
    if (qty > availableStock) {
      throw new Error(`Only ${availableStock} units available in stock.`);
    }

    let message = null;
    if (qty > MAX_QTY) {
      qty = MAX_QTY;
      message = `Quantity capped at ${MAX_QTY} units maximum.`;
    }

    cart.items.push({
      product: productId,
      variant: variantId,
      quantity: qty
    });

    if (message) {
      await cart.save();
      await Wishlist.updateOne({ user: userId }, { $pull: { items: { product: productId } } });
      return { success: true, message };
    }
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

const updateQuantity = async (userId, itemId, change) => {

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

const removeItem = async (userId, itemId) => {

  const cart = await Cart.findOne({ user: userId });

  if (!cart) return;

  cart.items.pull(itemId);

  await cart.save();
};

module.exports = {
  getCart,
  getCartCount,
  addToCart,
  updateQuantity,
  removeItem
};
