const checkoutService = require('../../services/user/checkoutService');

exports.getCheckoutPage = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const result = await checkoutService.getCheckoutData(userId);

    if (!result.success) {
      return res.redirect(result.redirect);
    }

    res.render('user/checkout', {
      cart: result.cart,
      addresses: result.addresses,
      finalTotal: result.finalTotal,
      user: req.session.user,
    });
  } catch (error) {
    console.error('Checkout Page Error:', error);

    res.status(500).send('Server Error');
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const { addressId, paymentMethod } = req.body;

    if (!addressId) {
      return res.status(400).send('Shipping address is required');
    }

    const result = await checkoutService.createOrder({
      userId,
      addressId,
      paymentMethod,
    });

    if (!result.success) {
      if (result.redirect) {
        return res.redirect(result.redirect);
      }

      return res.status(result.status || 400).send(result.message);
    }

    res.redirect(`/user/order-success/${result.order._id}`);
  } catch (error) {
    console.error('Order Placement Error:', error);

    res.status(500).send('Failed to place order');
  }
};
