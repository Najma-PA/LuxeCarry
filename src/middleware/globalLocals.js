// src/middleware/globalLocals.js

const cartService = require('../services/user/cartService');
const userService = require('../services/user/userService');

const globalLocals = async (req, res, next) => {
  try {
    const sessionUser = req.user || req.session?.user || null;

    let user = null;

    if (sessionUser) {
      const userId = sessionUser._id || sessionUser.id;

      user = await userService.findUserById(userId);

      // If blocked/deleted
      if (!user || user.isBlocked) {
        req.session.user = null;

        if (req.logout) {
          req.logout(() => {});
        }

        user = null;
      }
    }

    res.locals.user = user;
    res.locals.admin = req.session?.admin || null;

    const userId = user ? user._id || user.id : null;

    res.locals.cartCount = userId ? await cartService.getCartCount(userId) : 0;
  } catch (err) {
    console.error('Global locals middleware error:', err);

    res.locals.user = null;
    res.locals.cartCount = 0;
  }

  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');

  next();
};

module.exports = globalLocals;
