const cartService = require('./cartService');
const couponService = require('./couponService');
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
  const coupons = await couponService.getEligibleCoupons(cart.total);
  //const finalTotal = cart.total;

  return {
    success: true,
    cart,
    addresses,
    coupons,
    finalTotal: cart.total,
  };
};
exports.applyCoupon = async (userId, couponCode) => {
  const cart = await cartService.getCart(userId);
  if (!cart || cart.items.length === 0) {
    return { success: false, message: 'Cart is empty' };
  }
  return await couponService.validateCoupon(couponCode, cart.total);
};

exports.createOrder = async ({ userId, addressId, paymentMethod, couponCode }) => {
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
      errors: validation.errors || [],
      message: validation.message,
    };
  }

  // Pricing

  const subtotal = cart.total;
  let coupon = null;
  let couponDiscount = 0;
  if (couponCode) {
    const couponResult = await couponService.validateCoupon(couponCode, subtotal);
    if (!couponResult.success) {
      return {
        success: false,

        message: couponResult.message,
      };
    }

    coupon = couponResult.coupon;
    couponDiscount = couponResult.discount;
  }
  const finalTotal = Number(subtotal - couponDiscount).toFixed(2);
  const distributedItems = couponService.distributeDiscount(cart.items, subtotal, couponDiscount);
  // Build order items
  const orderItems = [];

  for (const item of distributedItems) {
    const originalPrice = item.product.price;
    const finalPrice = item.finalPrice;
    const productDiscount = originalPrice - finalPrice;
    // const totalPrice = finalPrice * item.quantity;

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
      totalPrice: item.totalPrice,
      couponDiscount: item.couponDiscount,
      finalPayable: item.finalPayable,
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
    subtotal,
    couponCode: coupon?.code || '',
    couponDiscount,
    finalAmount: finalTotal,
    totalAmount: finalTotal,
  });
  if (coupon) {
    await couponService.incrementUsage(coupon._id);
  }
  // Clear cart
  await Cart.deleteOne({ user: userId });

  return {
    success: true,
    order,
  };
};
