const orderService = require('../../services/admin/orderService');
const walletController = require('../user/walletController');
const mongoose = require('mongoose');

exports.getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const dateRange = req.query.dateRange || 'All';
    const result = await orderService.getOrders({ page, limit, search, status, dateRange });

    res.render('admin/orders', {
      title: 'Orders | LuxeCarry Admin',
      orders: result.orders,
      pendingCount: result.pendingCount,
      shippedCount: result.shippedCount,
      processingCount: result.processingCount,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      search,
      status,
      dateRange,
      admin: req.session.admin,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid Order ID');
      return res.redirect('/admin/orders');
    }

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    res.render('admin/orderDetails', {
      title: 'Order Details | LuxeCarry Admin',
      order,
      admin: req.session.admin,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid Order ID');
      return res.redirect('/admin/orders');
    }

    await orderService.updateOrderStatus(orderId, orderStatus);
    req.flash('success', 'Order status updated successfully');
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    res.json({ success: false, message: 'Use proper status flow' });
    next(error);
  }
};

exports.updateOrderPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid Order ID');
      return res.redirect('/admin/orders');
    }

    await orderService.updateOrderPayment(orderId, paymentStatus);
    req.flash('success', 'Order payment status updated successfully');
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    next(error);
  }
};

exports.updateItemStatus = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      req.flash('error', 'Invalid Order or Item ID');
      return res.redirect('/admin/orders');
    }

    await orderService.updateItemStatus(orderId, itemId, status);
    req.flash('success', 'Item status updated successfully');
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    next(error);
  }
};

exports.updateItemRefund = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { refundAmount, refundStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      req.flash('error', 'Invalid Order or Item ID');
      return res.redirect('/admin/orders');
    }

    await orderService.updateItemRefund(orderId, itemId, refundAmount, refundStatus);
    req.flash('success', 'Refund updated successfully');
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    next(error);
  }
};

exports.approveOrderRequest = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { adminResponse } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      req.flash('error', 'Invalid Order or Item ID');
      return res.redirect('/admin/orders');
    }

    const result = await orderService.approveOrderRequest(orderId, itemId, adminResponse);

    if (!result.success) {
      req.flash('error', result.message);
      return res.redirect(`/admin/orders/${orderId}`);
    }
    const { order, item } = result;
    if (item.requestType === 'Return' && !item.refundProcessed) {
      const walletTransaction = await walletController.creditWallet({
        userId: order.userId,
        amount: item.finalPayable || item.totalPrice,
        transactionType: 'RETURN_REFUND',
        description: `Refund for returned ${item.product?.name || 'product'}`,
        orderId: order._id,
      });
      item.refundProcessed = true;
      item.refundStatus = 'Processed';
      item.walletTransactionId = walletTransaction.transaction._id;
      await order.save();
    }
    req.flash('success', result.message);
    return res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    next(error);
  }
};

exports.rejectOrderRequest = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { adminResponse } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      req.flash('error', 'Invalid Order or Item ID');
      return res.redirect('/admin/orders');
    }
    if (!adminResponse?.trim()) {
      req.flash('error', 'Rejection reason required');
      return res.redirect(`/admin/orders/${orderId}`);
    }

    const result = await orderService.rejectOrderRequest(orderId, itemId, adminResponse.trim());

    if (!result.success) {
      req.flash('error', result.message);
      return res.redirect(`/admin/orders/${orderId}`);
    }

    req.flash('success', result.message);
    return res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    next(error);
  }
};
