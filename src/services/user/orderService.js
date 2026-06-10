const Order = require('../../models/orderModel');

const restoreStock = require('../../utils/adminHelpers/inventory');

const { validateReturnEligibility } = require('../../utils/userHelpers/orderValidation');

exports.getUserOrders = async (userId) => {
  const orders = await Order.find({ userId }).populate('items.product').sort({ createdAt: -1 });

  return orders;
};

exports.filterOrders = async (userId, search, status) => {
  const query = { userId };

  if (status && status !== 'All' && status !== 'All Orders') {
    query['items.status'] = status;
  }

  if (search && search.trim() !== '') {
    let cleanSearch = search.trim();

    if (cleanSearch.startsWith('#')) {
      cleanSearch = cleanSearch.substring(1);
    }

    const searchRegex = new RegExp(cleanSearch, 'i');

    query.$or = [
      {
        orderId: searchRegex,
      },
      {
        'items.productName': searchRegex,
      },
    ];

    if (/^[0-9a-fA-F]{24}$/.test(cleanSearch)) {
      query.$or.push({
        _id: cleanSearch,
      });
    }
  }

  const orders = await Order.find(query).populate('items.product').sort({ createdAt: -1 });

  return orders;
};

exports.getOrderById = async (orderId) => {
  const order = await Order.findById(orderId).populate('items.product');

  return order;
};

exports.getOrderedProductDetails = async (orderId, itemId, userId) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
  }).populate('items.product');

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  const orderedItem = order.items.id(itemId);

  if (!orderedItem) {
    return {
      success: false,
      message: 'Product not found',
    };
  }

  return {
    success: true,
    order,
    item: orderedItem,
  };
};

exports.cancelOrder = async (orderId, itemId, userId, reason) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
  }).populate('items.product');

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
      message: 'Item not found in order',
    };
  }

  if (
    item.status === 'Shipped' ||
    item.status === 'Out for Delivery' ||
    item.status === 'Delivered' ||
    item.status === 'Cancelled' ||
    item.status === 'Returned'
  ) {
    return {
      success: false,
      message: 'Item cannot be cancelled at this stage',
    };
  }

  item.previousStatus = item.status;

  item.status = 'Cancelled';

  item.cancelReason = reason?.trim() || 'Cancelled by customer';

  item.cancelledAt = new Date();

  item.requestStatus = 'Approved';

  await restoreStock(item);

  // REFUND
  if (order.paymentStatus === 'Paid' && order.paymentMethod !== 'COD') {
    item.refundAmount = item.finalPayable || item.totalPrice;

    // item.refundStatus = 'Pending';
  }

  const allCancelled = order.items.every((i) => i.status === 'Cancelled');

  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  }

  await order.save();

  return {
    success: true,
    order,
    item,
  };
};

exports.returnOrder = async (orderId, itemId, userId, reason, customReason) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
  });

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  const item =
    order.items.id(itemId) || order.items.find((i) => i._id.toString() === itemId.toString());

  if (!item) {
    return {
      success: false,
      message: 'Item not found in order',
    };
  }

  const validation = validateReturnEligibility({
    item,
    reason,
    customReason,
  });

  if (!validation.success) {
    return validation;
  }

  const finalReason = validation.finalReason;

  item.previousStatus = item.status;

  item.status = 'Return Requested';

  item.requestType = 'Return';

  item.returnReason = finalReason || '';

  item.returnedAt = new Date();

  const allReturnedOrCancelled = order.items.every(
    (i) => i.status === 'Returned' || i.status === 'Cancelled'
  );

  if (allReturnedOrCancelled) {
    order.orderStatus = 'Returned';
  }

  await order.save();

  return {
    success: true,
  };
};
