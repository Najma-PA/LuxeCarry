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

  // Mark items as unavailable rather than filtering them out
  cart.items.forEach(i => {
    i.isAvailable = i.product && 
                   i.product.isActive && 
                   i.product.category && 
                   i.product.category.isActive &&
                   i.product.category.isDeleted !== true;
  });

  let subtotal = 0;
  let totalDiscount = 0;

  cart.items.forEach(item => {
    if(!item.product){
      item.isAvailable =false;
      return;
    }
    const originalPrice = typeof item.product.price==='number' ? item.product.price : 0;

    const productOffer = item.product.offer || 0;
    const categoryOffer = (item.product.category && item.product.category.offer) ? item.product.category.offer : 0;
    const bestOffer = Math.max(productOffer, categoryOffer);

    const finalPrice = Math.round(originalPrice - (originalPrice * bestOffer / 100));
    const discountAmount = originalPrice - finalPrice;

    subtotal += originalPrice * item.quantity;
    totalDiscount += discountAmount * item.quantity;

    item.finalPrice = finalPrice;
    item.itemTotal = finalPrice * item.quantity;
    item.appliedOffer = bestOffer;

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
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      populate: { path: 'category' }
    });

  if (!cart) return 0;

  // Filter items matching getCart logic
  const activeItems = cart.items.filter(i => 
    i.product && 
    i.product.isActive && 
    i.product.category && 
    i.product.category.isActive &&
    i.product.category.isDeleted !== true
  );

  return activeItems.reduce((sum, item) => sum + item.quantity, 0);
};



//Add to Cart

const addToCart = async (userId, productId, variantId, qty = 1) => {

  const product = await Product.findById(productId).populate('category');

  if (!product || !product.isActive) {
    throw new Error('Product is currently unavailable');
  }

  if (!product.category || !product.category.isActive || product.category.isDeleted) {
    throw new Error('Product is currently unavailable');
  }

  qty = parseInt(qty);
  if (isNaN(qty) || qty < 1) qty = 1;

  // If no variantId
  if (product.variants && product.variants.length > 0) {

  if (!variantId) {
    throw new Error("Please select a variant");
  }

  const selectedVariant = product.variants.id(variantId);

  if (!selectedVariant) {
    throw new Error("Selected variant is invalid");
  }

  if (selectedVariant.stock <= 0) {
    throw new Error("Selected variant is out of stock");
  }
}
  /*if (!variantId && product.variants && product.variants.length > 0) {
    variantId = product.variants[0]._id;
  }
*/
  // Find variant for stock check if applicable
let selectedVariant = null;

if (product.variants && product.variants.length > 0) {
  selectedVariant = product.variants.id(variantId);
}

const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

 /* let selectedVariant = null;
  if (variantId && product.variants) {
    selectedVariant = product.variants.id(variantId);
  }
*/


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
      const cartCount = await getCartCount(userId);
      return { 
        success: true, 
        message: `Quantity capped at ${MAX_QTY} units maximum.`,
        cartCount
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
    message =`Quantity capped at ${MAX_QTY} units maximum.`;
    }

    cart.items.push({
      product: productId,
      variant: variantId,
      quantity: qty
    });

    if (message) {
      await cart.save();
      await Wishlist.updateOne({ user: userId }, { $pull: { items: { product: productId } } });
      const cartCount = await getCartCount(userId);
      return { success: true, message, cartCount };
    }
  }

  await cart.save();

  //Remove from wishlist
  await Wishlist.updateOne(
    { user: userId },
    { $pull: { items: { product: productId } } }
  );

  const cartCount = await getCartCount(userId);

  return { success: true, cartCount };
};


//Update Quantity

const updateQuantity = async (userId, itemId, change) => {

  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      populate: { path: 'category' }
    });

  if (!cart) return { success: false, message: 'Cart not found' };

  const item = cart.items.id(itemId);

  if (!item || !item.product) {
    return { success: false, message: 'Item not found' };
  }

  if (!item.product.isActive || !item.product.category || !item.product.category.isActive || item.product.category.isDeleted) {
    return { success: false, message: 'Product is currently unavailable' };
  }

  change = parseInt(change);

  // Determine available stock
  let availableStock = item.product.stock;
  if (item.variant && item.product.variants) {
    const variant = item.product.variants.id(item.variant);
    if (variant) {
      availableStock = variant.stock;
    }
  }

  // Increase
  if (change === 1) {
    if (item.quantity >= MAX_QTY) {
      return { success: false, message: `Maximum ${MAX_QTY} units allowed per item.` };
    }
    if (item.quantity >= availableStock) {
      return { success: false, message: 'Only ' + availableStock + ' units available in stock.' };
    }
    item.quantity++;
  }

  // Decrease
  if (change === -1) {
    item.quantity--;
    if (item.quantity <= 0) {
      cart.items.pull(item._id);
    }
  }

  await cart.save();

  // Return full updated cart for dynamic UI
  const updatedCart = await getCart(userId);
  const cartCount = await getCartCount(userId);
  
  // Find the specific item's new subtotal
  const updatedItem = item.quantity > 0 ? updatedCart.items.find(i => i._id.toString() === itemId.toString()) : null;

  return { 
    success: true, 
    newQty: item.quantity,
    availableStock,
    itemTotal: updatedItem ? updatedItem.itemTotal : 0,
    cartSubtotal: updatedCart.subtotal,
    cartDiscount: updatedCart.totalDiscount,
    cartTotal: updatedCart.total,
    itemCount: updatedCart.items.length,
    cartCount
  };
};

// Remove Item

const removeItem = async (userId, itemId) => {

  const cart = await Cart.findOne({ user: userId });

  if (!cart) return null;

  cart.items.pull(itemId);

  await cart.save();

  // Return full updated cart for dynamic UI
  return await getCart(userId);
};

//validate cart
const validateCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'category' }
  });

  if (!cart || cart.items.length === 0) {
    return { success: false, message: 'Your cart is empty' };
  }

  const errors = [];

  for (const item of cart.items) {
    const product = item.product;
    if(!product){
      errors.push({
        id:item._id.toString(),
        message: "Product no longer exists"
        
      });
      continue;
    }
    // Product availability
    const isAvailable = product &&
      product.isActive &&
      product.category &&
      product.category.isActive &&
      product.category.isDeleted !== true;

    if (!isAvailable) {
      errors.push({
        id: item._id.toString(),
        message: `${product ? product.name : 'Product'} is unavailable`
      });
      continue;
    }

    let availableStock = product.stock;

    if (product.variants && product.variants.length > 0) {
      // Must have variant
      if (!item.variant) {
        errors.push({
          id: item._id.toString(),
          message: "Please reselect this product option"
        });
        continue;
      }

      // Get variant FIRST
      const variant = product.variants.id(item.variant);

      if (!variant) {
        errors.push({
          id: item._id.toString(),
          message: `${product.name} variant no longer exists`
        });
        continue;
      }

      // ONLY variant stock
      availableStock = variant.stock;
    }

    //Stock validation
    if (availableStock <= 0) {
      errors.push({
        id: item._id.toString(),
        message: `${product.name} is out of stock`
      });
    } else if (item.quantity > availableStock) {
      errors.push({
        id: item._id.toString(),
        message: `Only ${availableStock} units available`
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true };
};
/*const validateCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'category' }
  });

  if (!cart || cart.items.length === 0) {
    return { success: false, message: 'Your cart is empty' };
  }
  

  const errors = [];

  for (const item of cart.items) {
    const product = item.product;

    const isAvailable = product &&
      product.isActive &&
      product.category &&
      product.category.isActive &&
      product.category.isDeleted !== true;
    
    // Product unavailable
    if (!isAvailable) {
      errors.push({
        id: item._id.toString(),
        message: `${product ? product.name : 'Product'} is unavailable`
      });
      continue;
    }
    
    //
    if (product?.variants?.length > 0 && !item.variant) {
  errors.push({
    id: item._id.toString(),
    message: "Please reselect this product option"
  });
  continue;
}
    let availableStock = variant ? variant.stock : product.stock;
    

    // Variant check
    let variant =null;

    if(product.variants && product.variants.length>0){
      if(!item.variant){
        errors.push({
          id:item._id.toString(),
          message: "Please reselect this product option"

        });
        continue;
      }

      variant = product.variants.id(item.variant);

      if(!variant){
        errors.push({
          id:item._id.toString(),
          message:`${product.name} variant no longer exists`
        });
        continue;
      }
    }
    
     
    if(availableStock <=0){
      errors.push({
        id:item._id.toString(),
        message:`${product.name} is out of stock`
      });
    }else if(item.quantity >availableStock){
      errors.push({
        id:item._id.toString(),
        message:`Only ${availableStock} units available`
      })
    }

  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true };
};
*/

module.exports = {
  getCart,
  getCartCount,
  addToCart,
  updateQuantity,
  removeItem,
  validateCart,
  getCartItemsStatus: async (userId) => {
    const cart = await getCart(userId);
    const cartCount = await getCartCount(userId);
    return {
      success: true,
      items: cart.items.map(i => ({
        id: i._id,
        isAvailable: i.isAvailable,
        stock: i.variantDetail ? i.variantDetail.stock : (i.product ? i.product.stock : 0),
        quantity: i.quantity,
        itemTotal: i.itemTotal
      })),
      cartSubtotal: cart.subtotal,
      cartDiscount: cart.totalDiscount,
      cartTotal: cart.total,
      cartCount
    };
  }
};
