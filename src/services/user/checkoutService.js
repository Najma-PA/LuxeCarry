const cartService = require('./cartService');
const couponService = require('./couponService');

const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const User = require('../../models/userModel');

const walletController = require('../../controllers/user/walletController');

exports.getCheckoutData = async (userId) => {
  const cart = await cartService.getCart(userId);

  if (!cart || cart.items.length === 0) {
    return {
      success: false,
      redirect: '/user/cart',
      message: 'Cart is empty',
    };
  }

  const validation = await cartService.validateCart(userId);

  if (!validation.success) {
    return {
      success: false,
      redirect: '/user/cart',
      message: validation.message,
      errors: validation.errors || [],
    };
  }

  const addresses = await Address.find({ userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  const coupons = await couponService.getEligibleCoupons(cart.total);

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
    return {
      success: false,
      message: 'Cart is empty',
    };
  }

  return await couponService.validateCoupon(couponCode, cart.total);
};

exports.createOrder = async ({ userId, addressId, paymentMethod, couponCode }) => {
  const address = await Address.findById(addressId);

  if (!address) {
    return {
      success: false,
      status: 404,
      message: 'Selected shipping address not found',
    };
  }

  const cart = await cartService.getCart(userId);

  if (!cart || cart.items.length === 0) {
    return {
      success: false,
      redirect: '/user/cart',
      message: 'Cart is empty',
    };
  }

  const validation = await cartService.validateCart(userId);

  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors || [],
      message: validation.message,
    };
  }

  const subtotal = cart.total;

  let coupon = null;
  let couponDiscount = 0;

  if (couponCode) {
    const couponResult = await couponService.validateCoupon(couponCode, subtotal);

    if (couponResult.success) {
      coupon = couponResult.coupon;

      couponDiscount = couponResult.discount;
    }
  }

  const finalTotal = subtotal - couponDiscount;
  if (paymentMethod === 'WALLET') {
    try {
      await walletController.debitWallet({
        userId,

        amount: finalTotal,

        transactionType: 'ORDER_PAYMENT',

        description: 'Payment for order',
      });
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  const distributedItems = couponService.distributeDiscount(cart.items, subtotal, couponDiscount);

  const orderItems = [];

  for (const item of distributedItems) {
    const originalPrice = item.product.price;

    const finalPrice = item.finalPrice;

    const productDiscount = originalPrice - finalPrice;

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

    if (item.variant) {
      await Product.updateOne(
        {
          _id: item.product._id,
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
        {
          _id: item.product._id,
        },
        {
          $inc: {
            stock: -item.quantity,
          },
        }
      );
    }
  }

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

    paymentStatus: ['RAZORPAY', 'WALLET'].includes(paymentMethod) ? 'Paid' : 'Pending',

    orderStatus: 'Pending',

    subtotal,

    couponCode: coupon?.code || '',

    couponDiscount,

    finalAmount: finalTotal,

    totalAmount: finalTotal,
  });

  const user = await User.findById(userId);
  const orderCount = await Order.countDocuments({ userId });

  if (user.referredBy && !user.referralRewardClaimed) {
    if (orderCount === 1) {
      const rewardAmount = 50;
      //reward to new user
      await walletController.creditWallet({
        userId: user._id,
        amount: rewardAmount,
        transactionType: 'REFERRAL',
        description: 'Referral reward',
        orderId: order._id,
      });
      await walletController.creditWallet({
        userId: user.referredBy,
        amount: 100,
        transactionType: 'REFERRAL',
        description: 'Referral earnings',
        orderId: order._id,
      });
    }
    user.referralRewardClaimed = true;

    await user.save();
  }
  if (coupon) {
    await couponService.incrementUsage(coupon._id);
  }

  await Cart.deleteOne({
    user: userId,
  });

  return {
    success: true,
    order,
  };
};
