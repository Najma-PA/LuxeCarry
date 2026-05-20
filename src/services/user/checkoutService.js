const cartService = require('./cartService');

const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');

exports.getCheckoutData = async (userId) => {
  const cart = await cartService.getCart(userId);

  if (!cart || cart.items.length === 0) {
    return {
      success: false,
      redirect: '/user/cart',
      message: 'Cart is empty',
    };
  }

  // Validate stock
  const validation = await cartService.validateCart(userId);

  if (!validation.success) {
    return {
      success: false,
      redirect: '/user/cart',
      message: validation.message,
    };
  }

  const addresses = await Address.find({ userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  const finalTotal = cart.total;

  return {
    success: true,
    cart,
    addresses,
    finalTotal,
  };
};

exports.createOrder = async ({ userId, addressId, paymentMethod }) => {
  // Validate address
  const address = await Address.findById(addressId);

  if (!address) {
    return {
      success: false,
      status: 404,
      message: 'Selected shipping address not found',
    };
  }

  // Get cart
  const cart = await cartService.getCart(userId);

  if (!cart || cart.items.length === 0) {
    return {
      success: false,
      redirect: '/user/cart',
      message: 'Cart is empty',
    };
  }

  // Validate stock
  const validation = await cartService.validateCart(userId);

  if (!validation.success) {
    return {
      success: false,
      redirect: '/user/cart',
      message: validation.message,
    };
  }

  // Pricing

  const finalTotal = cart.total;

  // Build order items
  const orderItems = [];

  for (const item of cart.items) {
    const originalPrice = item.product.price;
    const finalPrice = item.finalPrice;
    const productDiscount = originalPrice - finalPrice;
    const totalPrice = finalPrice * item.quantity;

    const variantDetail = item.variantDetail;
    const productImage = item.product.thumbnail?.url || item.product.displayImage || '';

    orderItems.push({
      product: item.product._id,
      productName: item.product.name,
      productImage,
      variant: item.variant || null,
      variantValue: variantDetail ? variantDetail.value : null,
      quantity: item.quantity,
      originalPrice,
      productDiscount,
      finalPrice,
      totalPrice,
      status: 'Pending',
    });

    // Deduct stock
    if (item.variant) {
      await Product.updateOne(
        {
          _id: item.product,
          'variants._id': item.variant,
        },
        {
          $inc: {
            stock: -item.quantity,
            'variants.$.stock': -item.quantity,
          },
        }
      );
    } else {
      await Product.updateOne(
        { _id: item.product._id },
        {
          $inc: {
            stock: -item.quantity,
          },
        }
      );
    }
  }

  // Create order
  const order = await Order.create({
    userId,

    items: orderItems,

    shippingAddress: {
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    },

    paymentMethod,

    paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',

    orderStatus: 'Pending',

    totalAmount: finalTotal,
  });

  // Clear cart
  await Cart.deleteOne({ user: userId });

  return {
    success: true,
    order,
  };
};
