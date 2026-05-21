const orderService = require('../../services/admin/orderService');

exports.getOrders = async (req, res) => {
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
    console.error('Error fetching admin orders:', error);

    res.status(500).send('Server Error');
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return res.redirect('/admin/orders');
    }

    res.render('admin/orderDetails', {
      title: 'Order Details | LuxeCarry Admin',

      order,

      admin: req.session.admin,
    });
  } catch (error) {
    console.error('Error fetching admin order details:', error);

    res.redirect('/admin/orders');
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { orderStatus } = req.body;

    await orderService.updateOrderStatus(orderId, orderStatus);

    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error('Error updating orderStatus:', error);

    res.redirect('/admin/orders');
  }
};

exports.updateOrderPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { paymentStatus } = req.body;

    await orderService.updateOrderPayment(orderId, paymentStatus);

    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error('Error updating paymentStatus:', error);

    res.redirect('/admin/orders');
  }
};

exports.updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const { status } = req.body;

    await orderService.updateItemStatus(orderId, itemId, status);

    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error('Error updating item status:', error);

    res.redirect('/admin/orders');
  }
};

exports.updateItemRefund = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const { refundAmount, refundStatus } = req.body;

    await orderService.updateItemRefund(orderId, itemId, refundAmount, refundStatus);

    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error('Error updating item refund details:', error);

    res.redirect('/admin/orders');
  }
};
exports.approveOrderRequest = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { adminResponse, requestId } = req.body;
    const result = await orderService.approveOrderRequest(orderId, itemId, requestId, adminResponse);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
    return res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.log(error);
    return res.redirect('/admin/orders');
  }
};
exports.rejectOrderRequest = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { adminResponse, requestId } = req.body;

    const result = await orderService.rejectOrderRequest(orderId, itemId, requestId, adminResponse);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.log(error);

    return res.redirect('/admin/orders');
  }
};
