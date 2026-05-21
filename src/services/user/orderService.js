const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
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
    query.$or = [{ orderId: searchRegex }, { 'items.productName': searchRegex }];
    if (/^[0-9a-fA-F]{24}$/.test(cleanSearch)) {
      query.$or.push({ _id: cleanSearch });
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
const { calculateItemStatus, updateGlobalOrderStatus } = require('../../utils/orderStatusHelper');

exports.cancelOrder = async (orderId, itemId, userId, reason, requestedQty) => {
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

  const item = order.items.id(itemId);

  if (!item) {
    return {
      success: false,
      message: 'Item not found in order',
    };
  }

  // Pre-delivery status check
  const cannotCancelStatuses = ['Delivered', 'Returned', 'Partially Returned'];
  if (cannotCancelStatuses.includes(item.status)) {
    return { success: false, message: 'Item cannot be cancelled at this stage' };
  }

  const qty = Number(requestedQty) || 0;
  if (qty <= 0) {
    return { success: false, message: 'Invalid quantity requested for cancellation' };
  }

  // Calculate available cancel quantity
  const pendingCancelQty = item.cancelRequests
    ? item.cancelRequests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.quantity, 0)
    : 0;

  const availableCancelQty = item.quantity - item.cancelledQty - item.returnedQty - pendingCancelQty;

  if (qty > availableCancelQty) {
    return {
      success: false,
      message: `Only ${availableCancelQty} item(s) are available to cancel. You may have other pending cancellation requests.`,
    };
  }

  // Push new cancellation request
  if (!item.cancelRequests) {
    item.cancelRequests = [];
  }
  item.cancelRequests.push({
    quantity: qty,
    reason: reason || '',
    status: 'Pending',
    requestedAt: new Date(),
  });

  item.previousStatus = item.status;
  item.cancelReason = reason || '';
  item.cancelledAt = new Date();
  
  // Calculate dynamic item status
  item.status = calculateItemStatus(item, item.status, item.previousStatus);

  // Sync global orderStatus if applicable
  updateGlobalOrderStatus(order);

  await order.save();
  return { success: true };
};

exports.returnOrder = async (orderId, itemId, userId, reason, customReason, requestedQty) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  const item =
    order.items.id(itemId) || order.items.find((i) => i._id.toString() === itemId.toString());

  if (!item) {
    return { success: false, message: 'Item not found in order' };
  }

  // Must be delivered to initiate return
  const allowedReturnStatuses = ['Delivered', 'Partially Returned', 'Return Requested'];
  if (!allowedReturnStatuses.includes(item.status)) {
    return { success: false, message: 'Return not allowed for this item status' };
  }

  if (!item.deliveredAt) {
    return { success: false, message: 'Delivery date missing' };
  }
  const deliveredDate = new Date(item.deliveredAt);
  const today = new Date();
  const diffTime = today - deliveredDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  if (diffDays > 15) {
    return { success: false, message: 'Return period expired (maximum 15 days from delivery)' };
  }

  const qty = Number(requestedQty) || 0;
  if (qty <= 0) {
    return { success: false, message: 'Invalid quantity requested for return' };
  }

  // Calculate available return quantity
  const pendingReturnQty = item.returnRequests
    ? item.returnRequests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.quantity, 0)
    : 0;

  const deliveredQty = item.deliveredQty || (item.quantity - item.cancelledQty);
  const availableReturnQty = deliveredQty - item.returnedQty - pendingReturnQty;

  if (qty > availableReturnQty) {
    return {
      success: false,
      message: `Only ${availableReturnQty} item(s) are available to return. You may have other pending return requests.`,
    };
  }

  let finalReason = reason;
  if (reason === 'Other' && customReason) {
    finalReason = customReason;
  }

  // Push new return request
  if (!item.returnRequests) {
    item.returnRequests = [];
  }
  item.returnRequests.push({
    quantity: qty,
    reason: finalReason || '',
    status: 'Pending',
    requestedAt: new Date(),
  });

  item.previousStatus = item.status;
  item.returnReason = finalReason || '';
  item.returnedAt = new Date();

  // Calculate dynamic item status
  item.status = calculateItemStatus(item, item.status, item.previousStatus);

  // Sync global orderStatus if applicable
  updateGlobalOrderStatus(order);

  await order.save();
  return { success: true };
};
