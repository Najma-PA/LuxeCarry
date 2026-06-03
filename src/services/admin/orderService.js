const Order = require('../../models/orderModel');
const User = require('../../models/userModel');

const { calculateOrderStatus } = require('../../utils/adminHelpers/orderStatus');

const { validateStatusTransition } = require('../../utils/adminHelpers/orderValidation');

const restoreStock = require('../../utils/adminHelpers/inventory');

const { buildOrderQuery } = require('../../utils/adminHelpers/orderQuery');

exports.getOrders = async ({ page = 1, limit = 10, search = '', status = '', dateRange = '' }) => {
  const skip = (page - 1) * limit;

  const query = await buildOrderQuery({
    search,
    status,
    dateRange,
  });

  const totalOrders = await Order.countDocuments(query);

  const totalPages = Math.ceil(totalOrders / limit);

  const orders = await Order.find(query)
    .populate('userId', 'name email')
    .populate('items.product')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  orders.forEach((order) => {
    order.orderStatus = calculateOrderStatus(order.items);
  });

  const pendingCount = await Order.countDocuments({
    orderStatus: 'Pending',
  });

  const shippedCount = await Order.countDocuments({
    orderStatus: 'Shipped',
  });

  const processingCount = await Order.countDocuments({
    orderStatus: 'Confirmed',
  });

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
  return await Order.findById(orderId).populate('userId', 'name email').populate('items.product');
};

exports.updateOrderStatus = async (orderId, orderStatus) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  order.orderStatus = orderStatus;

  await order.save();

  return order;
};

exports.updateOrderPayment = async (orderId, paymentStatus) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  order.paymentStatus = paymentStatus;

  await order.save();

  return order;
};

exports.updateItemStatus = async (orderId, itemId, status) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  const item = order.items.id(itemId);

  if (!item) {
    throw new Error('Item not found in order');
  }

  const oldStatus = item.status;

  if (oldStatus === status) {
    return order;
  }

  validateStatusTransition(oldStatus, status);

  item.status = status;

  if (status === 'Cancelled') {
    item.cancelledAt = new Date();

    item.cancelReason = 'Cancelled by Administrator';
    await restoreStock(item);
  } else if (status === 'Returned') {
    item.returnedAt = new Date();

    item.returnReason = 'Returned by Administrator';
    await restoreStock(item);
  } else if (status === 'Delivered') {
    item.deliveredAt = new Date();
  }

  if ((status === 'Cancelled' || status === 'Returned') && order.paymentStatus === 'Paid') {
    item.refundAmount = item.finalPayable || item.totalPrice || item.finalPrice * item.quantity;
    item.refundStatus = 'Pending';
  }

  await order.save();

  return order;
};

exports.updateItemRefund = async (orderId, itemId, refundAmount, refundStatus) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  const item = order.items.id(itemId);

  if (!item) {
    throw new Error('Item not found in order');
  }

  item.refundAmount = Number(refundAmount) || 0;

  item.refundStatus = refundStatus;

  await order.save();

  return order;
};

exports.approveOrderRequest = async (orderId, itemId, adminResponse = '') => {
  const order = await Order.findById(orderId).populate('items.product');

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  const item = order.items.id(itemId);

  if (!item) {
    return {
      success: false,
      message: 'Item not found',
    };
  }

  if (item.requestStatus === 'Approved') {
    return {
      success: false,
      message: 'Request already approved',
    };
  }

  if (item.status === 'Return Requested') {
    item.status = 'Returned';

    item.requestStatus = 'Approved';

    item.adminResponse = adminResponse;

    item.requestProcessedAt = new Date();

    item.returnedAt = new Date();

    // DAMAGE CHECK
    const isDamaged = item.returnReason && item.returnReason.toLowerCase().includes('damage');

    if (!isDamaged) {
      await restoreStock(item);
    }

    if (order.paymentStatus === 'Paid') {
      item.refundAmount = item.finalPayable || item.totalPrice || item.finalPrice * item.quantity;
      item.refundStatus = 'Pending';
    }
  } else {
    return {
      success: false,
      message: 'Invalid request status',
    };
  }

  const allCancelled = order.items.every((i) => i.status === 'Cancelled');

  const allReturned = order.items.every((i) => i.status === 'Returned');

  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  } else if (allReturned) {
    order.orderStatus = 'Returned';
  }

  await order.save();

  return {
    success: true,
    order,
    item,
    message: 'Request approved successfully',
  };
};

exports.rejectOrderRequest = async (orderId, itemId, adminResponse = '') => {
  const order = await Order.findById(orderId);

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  const item = order.items.id(itemId);

  if (!item) {
    return {
      success: false,
      message: 'Item not found',
    };
  }

  if (item.requestStatus === 'Rejected') {
    return {
      success: false,
      message: 'Request already rejected',
    };
  }

  if (item.status !== 'Return Requested') {
    return {
      success: false,
      message: 'Invalid request status',
    };
  }

  // RESTORE PREVIOUS STATUS
  item.status = 'Delivered';

  item.requestStatus = 'Rejected';

  item.adminResponse = adminResponse;

  item.requestProcessedAt = new Date();

  item.requestRejectedAt = new Date();

  item.requestType = undefined;

  await order.save();

  return {
    success: true,
    message: 'Request rejected successfully',
  };
};

/*const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');

exports.getOrders = async ({ page = 1, limit = 10, search = '', status = '', dateRange = '' }) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (status && status !== 'All') {
    query['items.status'] = status;
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
    let trimmedSearch = search.trim();
    if (trimmedSearch.startsWith('#')) {
      trimmedSearch = trimmedSearch.substring(1);
    }
    const matchedUsers = await User.find({
      name: { $regex: trimmedSearch, $options: 'i' },
    }).select('_id');
    const userIds = matchedUsers.map((u) => u._id);

    query.$or = [
      { orderId: { $regex: trimmedSearch, $options: 'i' } },
      { 'items.productName': { $regex: trimmedSearch, $options: 'i' } },
    ];

    if (/^[0-9a-fA-F]{24}$/.test(trimmedSearch)) {
      query.$or.push({ _id: trimmedSearch });
    }

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
  orders.forEach((order) => {
    order.orderStatus = calculateOrderStatus(order.items);
  });
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
  return await Order.findById(orderId).populate('userId', 'name email').populate('items.product');
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
  const statusFlow = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];
  const currentIndex = statusFlow.indexOf(oldStatus);
  const newIndex = statusFlow.indexOf(status);
  const restricedStatuses = ['Cancelled', 'Returned', 'Return Requested'];
  if (restricedStatuses.includes(status)) {
    throw new Error('Use approval flow for return');
  }
  if (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex) {
    const error = new Error('Status cannot be updated backwards');
    error.statusCode = 400;
    throw error;
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

exports.approveOrderRequest = async (orderId, itemId, adminResponse = '') => {
  const order = await Order.findById(orderId);
  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }
  const item = order.items.id(itemId);

  if (!item) {
    return {
      success: false,
      message: 'Item not found',
    };
  }
  if (item.requestStatus === 'Approved') {
    return {
      success: false,
      message: 'Request already approved',
    };
  }

  if (item.status === 'Return Requested') {
    item.status = 'Returned';

    item.requestStatus = 'Approved';

    item.adminResponse = adminResponse;

    item.requestProcessedAt = new Date();

    item.returnedAt = new Date();

    // damage check
    const isDamaged = item.returnReason && item.returnReason.toLowerCase().includes('damage');

    if (!isDamaged) {
      if (item.variant) {
        await Product.updateOne(
          {
            _id: item.product,
            'variants._id': item.variant,
          },
          {
            $inc: {
              stock: item.quantity,
              'variants.$.stock': item.quantity,
            },
          }
        );
      } else {
        await Product.updateOne(
          {
            _id: item.product,
          },
          {
            $inc: {
              stock: item.quantity,
            },
          }
        );
      }
    }

    // REFUND
    if (order.paymentStatus === 'Paid') {
      item.refundAmount = item.totalPrice || item.finalPrice * item.quantity;

      item.refundStatus = 'Pending';
    }
  } else {
    return {
      success: false,
      message: 'Invalid request status',
    };
  }

  const allCancelled = order.items.every((i) => i.status === 'Cancelled');

  const allReturned = order.items.every((i) => i.status === 'Returned');

  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  } else if (allReturned) {
    order.orderStatus = 'Returned';
  }

  await order.save();

  return {
    success: true,
    message: 'Request approved successfully',
  };
};

exports.rejectOrderRequest = async (orderId, itemId, adminResponse = '') => {
  const order = await Order.findById(orderId);

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  const item = order.items.id(itemId);

  if (!item) {
    return {
      success: false,
      message: 'Item not found',
    };
  }

  if (item.requestStatus === 'Rejected') {
    return {
      success: false,
      message: 'Request already rejected',
    };
  }

  if (item.status !== 'Return Requested') {
    return {
      success: false,
      message: 'Invalid request status',
    };
  }

  //restore previous status
  item.status = 'Delivered';

  item.requestStatus = 'Rejected';

  item.adminResponse = adminResponse;

  item.requestProcessedAt = new Date();
  item.requestRejectedAt = new Date();

  item.requestType = undefined;

  await order.save();

  return {
    success: true,
    message: 'Request rejected successfully',
  };
};

const calculateOrderStatus = (items) => {
  const statuses = items.map((item) => item.status);

  const activeStatuses = statuses.filter((s) => s !== 'Cancelled' && s !== 'Returned');

  if (statuses.every((s) => s === 'Cancelled')) {
    return 'Cancelled';
  }

  if (statuses.every((s) => s === 'Returned')) {
    return 'Returned';
  }

  if (statuses.every((s) => s === 'Cancelled' || s === 'Returned')) {
    return 'Closed';
  }

  if (activeStatuses.length === 0) {
    return 'Closed';
  }

  if (activeStatuses.every((s) => s === 'Delivered')) {
    return 'Delivered';
  }

  // ALL ACTIVE ITEMS OUT FOR DELIVERY
  if (activeStatuses.every((s) => s === 'Out for Delivery')) {
    return 'Out for Delivery';
  }

  // ALL ACTIVE ITEMS SHIPPED
  if (activeStatuses.every((s) => s === 'Shipped')) {
    return 'Shipped';
  }

  // ALL ACTIVE ITEMS CONFIRMED
  if (activeStatuses.every((s) => s === 'Confirmed')) {
    return 'Confirmed';
  }

  // ALL ACTIVE ITEMS PENDING
  if (activeStatuses.every((s) => s === 'Pending')) {
    return 'Pending';
  }

  // PARTIAL STATES
  if (activeStatuses.includes('Delivered')) {
    return 'Partially Delivered';
  }

  if (activeStatuses.includes('Out for Delivery')) {
    return 'Partially Out for Delivery';
  }

  if (activeStatuses.includes('Shipped')) {
    return 'Partially Shipped';
  }

  if (activeStatuses.includes('Confirmed')) {
    return 'Partially Confirmed';
  }

  return 'Pending';
};
*/
