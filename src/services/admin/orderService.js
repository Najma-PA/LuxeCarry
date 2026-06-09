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
/*
exports.updateOrderStatus = async (orderId, orderStatus) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  order.orderStatus = orderStatus;

  await order.save();

  return order;
};
*/
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
  order.orderStatus = calculateOrderStatus(order.items);
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
      item.refundStatus = 'Processed';
    }
  } else {
    return {
      success: false,
      message: 'Invalid request status',
    };
  }
  /*
  const allCancelled = order.items.every((i) => i.status === 'Cancelled');

  const allReturned = order.items.every((i) => i.status === 'Returned');

  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  } else if (allReturned) {
    order.orderStatus = 'Returned';
  }
*/
  order.orderStatus = calculateOrderStatus(order.items);
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

  item.status = 'Delivered';

  item.requestStatus = 'Rejected';

  item.adminResponse = adminResponse;

  item.requestProcessedAt = new Date();

  item.requestRejectedAt = new Date();

  item.requestType = undefined;
  order.orderStatus = calculateOrderStatus(order.items);
  await order.save();

  return {
    success: true,
    message: 'Request rejected successfully',
  };
};
