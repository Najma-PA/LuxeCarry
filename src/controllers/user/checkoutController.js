const checkoutService = require('../../services/user/checkoutService');

const couponService = require('../../services/user/couponService');
const razorpayService = require('../../services/payment/razorpayService');
const walletService = require('../../services/user/walletService');
const crypto = require('crypto');
const mongoose = require('mongoose');

exports.getCheckoutPage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const result = await checkoutService.getCheckoutData(userId);

    if (!result.success) {
      if (result.message) req.flash('error', result.message);
      return res.redirect(result.redirect || '/user/cart');
    }
    let wallet = await walletService.findWalletByUserId(userId);

    if (!wallet) {
      wallet = await walletService.createWallet(userId);
    }
    res.render('user/checkout', {
      cart: result.cart,
      addresses: result.addresses,
      coupons: result.coupons,
      finalTotal: result.finalTotal,
      wallet,
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
};

exports.placeOrder = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        redirect: '/user/login',
      });
    }

    const { addressId, paymentMethod, couponCode } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Please select a shipping address' });
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ success: false, message: 'Invalid shipping address' });
    }
    if (paymentMethod === 'RAZORPAY') {
      const checkoutData = await checkoutService.getCheckoutData(userId);
      if (!checkoutData.success) {
        return res.status(400).json({
          success: false,
          message: checkoutData.message,
          errors: checkoutData.errors || [],
          redirect: checkoutData.redirect,
        });
      }
      let finalAmount = checkoutData.finalTotal;

      if (couponCode) {
        const couponResult = await checkoutService.applyCoupon(userId, couponCode);

        if (couponResult.success) {
          finalAmount = couponResult.finalTotal;
        }
      }

      const razorpayOrder = await razorpayService.createOrder(finalAmount);

      return res.json({
        success: true,

        razorpay: true,

        key: process.env.RAZORPAY_KEY_ID,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        razorpayOrderId: razorpayOrder.id,
      });
    }
    if (paymentMethod === 'WALLET') {
      let wallet = await walletService.findWalletByUserId(userId);

      if (!wallet) {
        wallet = await walletService.createWallet(userId);
      }

      const checkoutData = await checkoutService.getCheckoutData(userId);

      if (!checkoutData.success) {
        return res.status(400).json({
          success: false,
          message: checkoutData.message,
          errors: checkoutData.errors || [],
          redirect: checkoutData.redirect,
        });
      }

      let finalAmount = checkoutData.finalTotal;

      if (couponCode) {
        const couponResult = await checkoutService.applyCoupon(userId, couponCode);

        if (couponResult.success) {
          finalAmount = couponResult.finalTotal;
        }
      }

      if (wallet.balance < finalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance',
        });
      }
    }
    const result = await checkoutService.createOrder({
      userId,
      addressId,
      paymentMethod,
      couponCode,
    });

    if (!result.success) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
        errors: result.errors || [],
        redirect: result.redirect,
      });
    }

    return res.json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: result.order._id,
        redirect: `/user/order-success/${result.order._id}`,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getPaymentFailurePage = (req, res) => {
  res.render('user/payment-failure', {
    user: req.user,
  });
};
exports.getCouponsPage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const coupons = await couponService.getAllCoupons();

    res.render('user/coupons', {
      user: req.session.user,

      coupons,

      activePage: 'coupons',
    });
  } catch (error) {
    next(error);
  }
};

exports.applyCoupon = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { couponCode } = req.body;

    if (!couponCode) {
      return res.json({
        success: false,

        message: 'Coupon code required',
      });
    }

    const result = await checkoutService.applyCoupon(userId, couponCode);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.removeCoupon = async (req, res, next) => {
  try {
    return res.json({
      success: true,

      message: 'Coupon removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,

      addressId,
      paymentMethod,
      couponCode,
    } = req.body;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.json({
        success: false,

        message: 'Payment verification failed',
      });
    }

    const result = await checkoutService.createOrder({
      userId: req.user._id,

      addressId,

      paymentMethod,

      couponCode,
    });

    return res.json({
      success: true,

      orderId: result.order._id,
    });
  } catch (error) {
    next(error);
  }
};
