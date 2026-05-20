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
  } else if (status === 'Returned') {
    item.returnedAt = new Date();
    item.returnReason = 'Returned by Administrator';
  } else if (status === 'Delivered') {
    item.deliveredAt = new Date();
  }
  /*
  // Check if all items are cancelled or returned to auto-sync global order status
  const allCancelled = order.items.every((i) => i.status === 'Cancelled');
  const allReturned = order.items.every((i) => i.status === 'Returned');
  const allCancelledOrReturned = order.items.every(
    (i) => i.status === 'Cancelled' || i.status === 'Returned'
  );

  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  } else if (allReturned) {
    order.orderStatus = 'Returned';
  } else if (allCancelledOrReturned) {
    order.orderStatus = 'Returned';
  }
*/
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
  //cancellation approval
  if (item.status === 'Cancellation Requested') {
    item.status = 'Cancelled';
    item.requestStatus = 'Approved';
    item.adminResponse = adminResponse;
    item.requestProcessedAt = new Date();
    item.cancelledAt = new Date();

    //stock update
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
    //refund
    if (order.paymentStatus === 'Paid') {
      item.refundAmount = item.totalPrice || item.finalPrice * item.quantity;
      item.refundStatus = 'Pending';
    }
  } else if (item.status === 'Return Requested') {
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

  // AUTO ORDER STATUS

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

  // PREVENT DOUBLE REJECTION
  if (item.requestStatus === 'Rejected') {
    return {
      success: false,
      message: 'Request already rejected',
    };
  }

  // ONLY REQUEST STATUSES CAN BE REJECTED
  if (item.status !== 'Cancellation Requested' && item.status !== 'Return Requested') {
    return {
      success: false,
      message: 'Invalid request status',
    };
  }

  // RESTORE PREVIOUS STATUS
  item.status = item.previousStatus || 'Delivered';

  item.requestStatus = 'Rejected';

  item.adminResponse = adminResponse;

  item.requestProcessedAt = new Date();

  // CLEAR REQUEST TYPE
  item.requestType = undefined;

  await order.save();

  return {
    success: true,
    message: 'Request rejected successfully',
  };
};
