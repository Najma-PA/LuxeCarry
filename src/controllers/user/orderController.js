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
      user: req.user,
    });
  } catch (error) {
    console.error('Orders page error:', error);
    res.redirect('/user/home');
  }
};
exports.filterOrders = async (req, res) => {
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
    console.error('Error filtering orders:', error);
    return res.status(500).json({ success: false, message: 'Internal server Error' });
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
exports.getOrderedProductDetails = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const userId = req.user?._id || req.session.user?.id;

    const result = await orderService.getOrderedProductDetails(orderId, itemId, userId);

    if (!result.success) {
      return res.redirect('/user/orders');
    }

    res.render('user/orderDetails', {
      order: result.order,
      item: result.item,
      user: req.user,
    });
  } catch (error) {
    console.log(error);

    res.redirect('/user/orders');
  }
};
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id || req.session.user?.id;

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
    console.error('Cancel order controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

exports.returnOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason, customReason } = req.body;
    const userId = req.user?._id || req.session.user?.id;

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
    console.error('Return order controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
    });
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
//invoice download
exports.downloadInvoice = async (req, res) => {
  const { orderId } = req.params;
  const { itemId } = req.query;

  const order = await Order.findById(orderId).populate('userId');

  if (!order) {
    return res.status(404).send('Order not found');
  }

  // FILTER ONLY DELIVERED ITEM
  let invoiceItems = order.items;

  if (itemId) {
    invoiceItems = order.items.filter(
      (item) => item._id.toString() === itemId && item.status === 'Delivered'
    );
  } else {
    // FULL ORDER INVOICE ONLY IF ALL DELIVERED
    invoiceItems = order.items.filter((item) => item.status === 'Delivered');
  }

  if (invoiceItems.length === 0) {
    return res.status(400).send('No delivered items found');
  }

  // CALCULATE TOTAL
  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  res.render('user/invoice', {
    order,
    invoiceItems,
    invoiceTotal,
  });
};
exports.downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemId } = req.query;
    await invoiceService.generateInvoice(orderId, itemId, res);
  } catch (error) {
    console.log(error);

    res.status(500).send('Server Error');
  }
};
