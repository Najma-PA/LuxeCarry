const orderService = require('../../services/user/orderService');
const invoiceService = require('../../services/user/invoiceService');
const Order = require('../../models/orderModel');
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
    return res.redirect('/user/orders');
  } catch (error) {
    console.error(error);
    return res.redirect('/user/orders');
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

exports.previewInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate('userId').populate('items.product');

    if (!order) {
      return res.redirect('/user/orders');
    }

    res.render('user/invoicePreview', {
      order,
      user: req.session.user,
    });
  } catch (error) {
    console.log(error);
    res.redirect('/user/orders');
  }
};
//invoice download
exports.downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;

    await invoiceService.generateInvoice(orderId, res);
  } catch (error) {
    console.log(error);

    res.status(500).send('Server Error');
  }
};
