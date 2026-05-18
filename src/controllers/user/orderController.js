const orderService = require('../../services/user/orderService');
exports.getOrderSuccessPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return res.redirect('/user/home');
    }

    res.render('user/orderSuccess', {
      order,
      user: req.session.user,
    });
  } catch (error) {
    console.error('Order Success Page Error:', error);

    res.redirect('/user/home');
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.session.user.id;
    const orders = await orderService.getUserOrders(userId);
    res.render('user/orders', {
      orders,
      user: req.session.user,
    });
  } catch (error) {
    console.error('Orders page error:', error);
    res.redirect('/user/home');
  }
};
exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.redirect('/user/orders');
    }
    res.render('user/orderDetails', {
      order,

      user: req.session.user,
    });
  } catch (error) {
    console.error('Order page error:', error);
    res.redirect('/user/orders');
  }
};
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const result = await orderService.cancelOrder(orderId, userId, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
exports.returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const result = await orderService.returnOrder(orderId, userId, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.redirect(`/user/orders/${orderId}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
