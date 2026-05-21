const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');

exports.getOrders = async ({ page = 1, limit = 10, search = '', status = '', dateRange = '' }) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (status && status !== 'All') {
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

const { calculateItemStatus, updateGlobalOrderStatus } = require('../../utils/orderStatusHelper');

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
  const restricedStatuses = ['Cancelled', 'Returned', 'Cancellation Requested', 'Return Requested'];
  if (restricedStatuses.includes(status)) {
    throw new Error('Use approval flow for cancellation and return');
  }
  if (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex) {
    throw new Error('Status cannot be updated backwards');
  }

  item.status = status;
  if (status === 'Cancelled') {
    item.cancelledAt = new Date();
    item.cancelReason = 'Cancelled by Administrator';
    item.cancelledQty = item.quantity;
  } else if (status === 'Returned') {
    item.returnedAt = new Date();
    item.returnReason = 'Returned by Administrator';
    item.returnedQty = item.quantity;
  } else if (status === 'Delivered') {
    item.deliveredAt = new Date();
    item.deliveredQty = item.quantity - item.cancelledQty;
  }

  // Check if all items are cancelled or returned to auto-sync global order status
  updateGlobalOrderStatus(order);

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

exports.approveOrderRequest = async (orderId, itemId, requestId, adminResponse = '') => {
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

  // Find specific request
  let request = null;
  let requestType = null; // 'Cancel' or 'Return'

  if (item.cancelRequests) {
    request = item.cancelRequests.id(requestId) || item.cancelRequests.find(r => r._id.toString() === requestId?.toString());
    if (request) requestType = 'Cancel';
  }
  if (!request && item.returnRequests) {
    request = item.returnRequests.id(requestId) || item.returnRequests.find(r => r._id.toString() === requestId?.toString());
    if (request) requestType = 'Return';
  }

  // Fallback if no requestId was supplied
  if (!request) {
    const pendingCancel = item.cancelRequests && item.cancelRequests.find(r => r.status === 'Pending');
    if (pendingCancel) {
      request = pendingCancel;
      requestType = 'Cancel';
    } else {
      const pendingReturn = item.returnRequests && item.returnRequests.find(r => r.status === 'Pending');
      if (pendingReturn) {
        request = pendingReturn;
        requestType = 'Return';
      }
    }
  }

  if (!request) {
    return {
      success: false,
      message: 'No pending request found for this item',
    };
  }

  if (request.status !== 'Pending') {
    return {
      success: false,
      message: `This request has already been ${request.status.toLowerCase()}`,
    };
  }

  // Process based on request type
  if (requestType === 'Cancel') {
    request.status = 'Approved';
    item.cancelledQty = (item.cancelledQty || 0) + request.quantity;

    // Restore stock
    if (item.variant) {
      await Product.updateOne(
        {
          _id: item.product,
          'variants._id': item.variant,
        },
        {
          $inc: {
            stock: request.quantity,
            'variants.$.stock': request.quantity,
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
            stock: request.quantity,
          },
        }
      );
    }

    // Refund calculation
    if (order.paymentStatus === 'Paid') {
      item.refundAmount = (item.refundAmount || 0) + item.finalPrice * request.quantity;
      item.refundStatus = 'Pending';
    }
  } else if (requestType === 'Return') {
    request.status = 'Approved';
    item.returnedQty = (item.returnedQty || 0) + request.quantity;

    // Damage check: do not restore stock if returned as Damaged Product
    const isDamaged = request.reason && request.reason.toLowerCase().includes('damage');
    if (!isDamaged) {
      if (item.variant) {
        await Product.updateOne(
          {
            _id: item.product,
            'variants._id': item.variant,
          },
          {
            $inc: {
              stock: request.quantity,
              'variants.$.stock': request.quantity,
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
              stock: request.quantity,
            },
          }
        );
      }
    }

    // Refund calculation
    if (order.paymentStatus === 'Paid') {
      item.refundAmount = (item.refundAmount || 0) + item.finalPrice * request.quantity;
      item.refundStatus = 'Pending';
    }
  }

  // Update request response meta
  item.adminResponse = adminResponse;
  item.requestProcessedAt = new Date();
  item.requestStatus = 'Approved'; // For backward compatibility

  // Calculate dynamic status and sync global order status
  item.status = calculateItemStatus(item, item.status, item.previousStatus);
  updateGlobalOrderStatus(order);

  await order.save();

  return {
    success: true,
    message: 'Request approved successfully',
  };
};

exports.rejectOrderRequest = async (orderId, itemId, requestId, adminResponse = '') => {
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

  // Find specific request
  let request = null;

  if (item.cancelRequests) {
    request = item.cancelRequests.id(requestId) || item.cancelRequests.find(r => r._id.toString() === requestId?.toString());
  }
  if (!request && item.returnRequests) {
    request = item.returnRequests.id(requestId) || item.returnRequests.find(r => r._id.toString() === requestId?.toString());
  }

  // Fallback if no requestId was supplied
  if (!request) {
    const pendingCancel = item.cancelRequests && item.cancelRequests.find(r => r.status === 'Pending');
    if (pendingCancel) {
      request = pendingCancel;
    } else {
      const pendingReturn = item.returnRequests && item.returnRequests.find(r => r.status === 'Pending');
      if (pendingReturn) {
        request = pendingReturn;
      }
    }
  }

  if (!request) {
    return {
      success: false,
      message: 'No pending request found for this item',
    };
  }

  if (request.status !== 'Pending') {
    return {
      success: false,
      message: `This request has already been ${request.status.toLowerCase()}`,
    };
  }

  // Reject the request
  request.status = 'Rejected';

  // Update request response meta
  item.adminResponse = adminResponse;
  item.requestProcessedAt = new Date();
  item.requestStatus = 'Rejected'; // For backward compatibility

  // Calculate dynamic status and sync global order status
  item.status = calculateItemStatus(item, item.status, item.previousStatus);
  updateGlobalOrderStatus(order);

  await order.save();

  return {
    success: true,
    message: 'Request rejected successfully',
  };
};
