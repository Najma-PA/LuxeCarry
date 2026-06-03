const checkoutService = require('../../services/user/checkoutService');

const couponService = require('../../services/user/couponService');

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

    res.render('user/checkout', {
      cart: result.cart,
      addresses: result.addresses,
      finalTotal: result.finalTotal,
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

    const { addressId, paymentMethod } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Please select a shipping address' });
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ success: false, message: 'Invalid shipping address' });
    }

    const result = await checkoutService.createOrder({
      userId,
      addressId,
      paymentMethod,
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

/* =========================================
   GET USER COUPON PAGE
========================================= */

exports.getCouponsPage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    /*
    =========================================
    AUTH CHECK
    =========================================
    */

    if (!userId) {
      return res.redirect('/user/login');
    }

    /*
    =========================================
    GET ALL ACTIVE COUPONS
    =========================================
    */

    const coupons = await couponService.getAllCoupons();

    /*
    =========================================
    RENDER PAGE
    =========================================
    */

    res.render('user/coupons', {
      user: req.session.user,

      coupons,

      activePage: 'coupons',
    });
  } catch (error) {
    next(error);
  }
};
