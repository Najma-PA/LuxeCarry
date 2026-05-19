const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');

exports.getOrders = async ({ page = 1, limit = 10, search = '', status = '', dateRange = '' }) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (status) {
    query.orderStatus = status;
  }

  if (dateRange && dateRange !== 'All') {
    const now = new Date();
    let startDate = new Date();
    if (dateRange === 'Today') {
      startDate.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startDate };
    } else if (dateRange === 'Yesterday') {
      const yesterdayStart = new Date();
      yesterdayStart.setDate(now.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date();
      yesterdayEnd.setDate(now.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: yesterdayStart, $lte: yesterdayEnd };
    } else if (dateRange === 'Last 7 Days') {
      startDate.setDate(now.getDate() - 7);
      query.createdAt = { $gte: startDate };
    } else if (dateRange === 'Last 30 Days') {
      startDate.setDate(now.getDate() - 30);
      query.createdAt = { $gte: startDate };
    }
  }

  if (search) {
    const trimmedSearch = search.trim();
    // Resolve user IDs matching customer name search
    const matchedUsers = await User.find({
      name: { $regex: trimmedSearch, $options: 'i' }
    }).select('_id');
    const userIds = matchedUsers.map(u => u._id);

    query.$or = [
      { orderId: { $regex: trimmedSearch, $options: 'i' } },
      { 'items.productName': { $regex: trimmedSearch, $options: 'i' } }
    ];

    if (userIds.length > 0) {
      query.$or.push({ userId: { $in: userIds } });
    }
  }

  const totalOrders = await Order.countDocuments(query);
  const totalPages = Math.ceil(totalOrders / limit);

  const orders = await Order.find(query)
    .populate('userId', 'name email')
    .populate('items.product')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const pendingCount = await Order.countDocuments({ orderStatus: 'Pending' });
  const shippedCount = await Order.countDocuments({ orderStatus: 'Shipped' });
  const processingCount = await Order.countDocuments({ orderStatus: 'Confirmed' });

  return {
    orders,
    pendingCount,
    shippedCount,
    processingCount,
    totalPages,
    currentPage: page,
  };
};

exports.getOrderById = async (orderId) => {
  return await Order.findById(orderId)
    .populate('userId', 'name email')
    .populate('items.product');
};

exports.updateOrderStatus = async (orderId, orderStatus) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  order.orderStatus = orderStatus;
  await order.save();
  return order;
};

exports.updateOrderPayment = async (orderId, paymentStatus) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  order.paymentStatus = paymentStatus;
  await order.save();
  return order;
};

exports.updateItemStatus = async (orderId, itemId, status) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const item = order.items.id(itemId);
  if (!item) throw new Error('Item not found in order');

  const oldStatus = item.status;
  if (oldStatus === status) return order;

  // Handle stock restoration if state becomes Cancelled or Returned
  if ((status === 'Cancelled' || status === 'Returned') && oldStatus !== 'Cancelled' && oldStatus !== 'Returned') {
    // Restore stock
    if (item.variant) {
      await Product.updateOne(
        { _id: item.product, 'variants._id': item.variant },
        { $inc: { 'variants.$.stock': item.quantity } }
      );
    } else {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
    }

    // Set refund amount & status if payment status is Paid
    if (order.paymentStatus === 'Paid') {
      item.refundAmount = item.totalPrice || (item.finalPrice * item.quantity);
      item.refundStatus = 'Pending';
    }
  }

  item.status = status;
  if (status === 'Cancelled') {
    item.cancelledAt = new Date();
    item.cancelReason = 'Cancelled by Administrator';
  } else if (status === 'Returned') {
    item.returnedAt = new Date();
    item.returnReason = 'Returned by Administrator';
  } else if (status === 'Delivered') {
    item.deliveredAt = new Date();
  }

  // Check if all items are cancelled or returned to auto-sync global order status
  const allCancelled = order.items.every(i => i.status === 'Cancelled');
  const allReturned = order.items.every(i => i.status === 'Returned');
  const allCancelledOrReturned = order.items.every(i => i.status === 'Cancelled' || i.status === 'Returned');

  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  } else if (allReturned) {
    order.orderStatus = 'Returned';
  } else if (allCancelledOrReturned) {
    order.orderStatus = 'Returned';
  }

  await order.save();
  return order;
};

exports.updateItemRefund = async (orderId, itemId, refundAmount, refundStatus) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const item = order.items.id(itemId);
  if (!item) throw new Error('Item not found in order');

  item.refundAmount = Number(refundAmount) || 0;
  item.refundStatus = refundStatus;

  await order.save();
  return order;
};
