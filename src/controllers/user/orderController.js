const orderService = require('../../services/user/orderService');
const invoiceService = require('../../services/user/invoiceService');
const Order = require('../../models/orderModel');
const mongoose = require('mongoose');

exports.getOrderSuccessPage = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid order ID');
      return res.redirect('/user/home');
    }

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/user/home');
    }

    res.render('user/orderSuccess', {
      order,
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : req.session.user.id;
    const orders = await orderService.getUserOrders(userId);
    res.render('user/orders', {
      orders,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};
exports.filterOrders = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : req.session.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }
    const { search, status } = req.query;
    const orders = await orderService.filterOrders(userId, search, status);
    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/*exports.getOrderDetails = async (req, res) => {
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
};*/
exports.getOrderedProductDetails = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      req.flash('error', 'Invalid Order or Item ID');
      return res.redirect('/user/orders');
    }

    const userId = req.user?._id || req.session.user?.id;

    const result = await orderService.getOrderedProductDetails(orderId, itemId, userId);

    if (!result.success) {
      if (result.message) req.flash('error', result.message);
      return res.redirect('/user/orders');
    }

    res.render('user/orderDetails', {
      order: result.order,
      item: result.item,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};
exports.cancelOrder = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id || req.session.user?.id;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid Order or Item ID' });
    }

    const result = await orderService.cancelOrder(orderId, itemId, userId, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cancellation requested successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.returnOrder = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason, customReason } = req.body;
    const userId = req.user?._id || req.session.user?.id;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid Order or Item ID' });
    }

    const result = await orderService.returnOrder(orderId, itemId, userId, reason, customReason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Return requested successfully',
    });
  } catch (error) {
    next(error);
  }
};
/*
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id || req.session.user?.id;
    const result = await orderService.cancelOrder(orderId, itemId, userId, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.redirect(`/user/orders/${orderId}/product/${itemId}`);
  } catch (error) {
    console.error(error);
    return res.redirect('/user/orders');
  }
};
exports.returnOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason, customReason } = req.body;
    const userId = req.user?._id || req.session.user?.id;
    const result = await orderService.returnOrder(orderId, itemId, userId, reason, customReason);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.redirect(`/user/orders/${orderId}/product/${itemId}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
*/
/*
exports.downloadInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { itemId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid Order ID');
      return res.redirect('back');
    }
    if (itemId && !mongoose.Types.ObjectId.isValid(itemId)) {
      req.flash('error', 'Invalid Item ID');
      return res.redirect('back');
    }

    await invoiceService.generateInvoice(orderId, itemId, res);
  } catch (error) {
    next(error);
  }
};*/
exports.downloadInvoice = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;

    // VALIDATE IDS

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).send('Invalid Order or Item ID');
    }

    const result = await invoiceService.generateInvoice(orderId, itemId, res);

    if (!result.success) {
      return res.status(404).send(result.message);
    }
  } catch (error) {
    console.error('Invoice Download Error:', error);

    return res.status(500).send('Failed to generate invoice');
  }
};
