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
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { search, status } = req.query;

    const query = { userId };

    if (status && status !== 'All' && status !== 'All Orders') {
      query['items.status'] = status;
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search.trim(), $options: 'i' } },
        { 'items.productName': { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('items.product')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error filtering orders:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
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
