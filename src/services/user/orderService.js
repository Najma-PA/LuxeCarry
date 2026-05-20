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
exports.cancelOrder = async (orderId, itemId, userId, reason) => {
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

  if (item.status === 'Delivered' || item.status === 'Cancelled' || item.status === 'Returned') {
    return { success: false, message: 'Item cannot be cancelled at this stage' };
  }

  item.previousStatus = item.status;
  item.status = 'Cancellation Requested';
  item.cancelReason = reason || '';
  item.cancelledAt = new Date();

  // Refund fields
  if (order.paymentStatus === 'Paid') {
    item.refundAmount = item.totalPrice || item.finalPrice * item.quantity;
    item.refundStatus = 'Pending';
  }

  // Check if all items are cancelled
  const allCancelled = order.items.every((i) => i.status === 'Cancelled');
  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  }

  await order.save();
  return { success: true };
};

exports.returnOrder = async (orderId, itemId, userId, reason, customReason) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  const item =
    order.items.id(itemId) || order.items.find((i) => i._id.toString() === itemId.toString());

  if (!item) {
    return { success: false, message: 'Item not found in order' };
  }

  if (item.status !== 'Delivered') {
    return { success: false, message: 'Return not allowed for this item status' };
  }

  let finalReason = reason;
  if (reason === 'Other' && customReason) {
    finalReason = customReason;
  }
  item.previousStatus = item.status;
  item.status = 'Return Requested';
  item.returnReason = finalReason || '';
  item.returnedAt = new Date();
  if (!item.deliveredAt) {
    return { success: false, message: 'Delivery date missing' };
  }
  const deliveredDate = new Date(item.deliveredAt);
  const today = new Date();
  const diffTime = today - deliveredDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  if (diffDays > 15) {
    return { success: false, message: 'Return period expired' };
  }
  /* Restore stock 
  const isDamaged = finalReason === 'Damaged Product' || reason === 'Damaged Product';
  if (!isDamaged) {
    if (item.variant) {
      await Product.updateOne(
        {
          _id: item.product,
          'variants._id': item.variant,
        },
        {
          $inc: {
            'variants.$.stock': item.quantity,
          },
        }
      );
    } else {
      await Product.updateOne(
        { _id: item.product },
        {
          $inc: {
            stock: item.quantity,
          },
        }
      );
    }
  }
*/

  /* Refund fields
  if (order.paymentStatus === 'Paid') {
    item.refundAmount = item.totalPrice || item.finalPrice * item.quantity;
    item.refundStatus = 'Pending';
  }

  // Check if all items are returned or cancelled to update global orderStatus
  const allReturnedOrCancelled = order.items.every(
    (i) => i.status === 'Returned' || i.status === 'Cancelled'
  );
  if (allReturnedOrCancelled) {
    order.orderStatus = 'Returned';
  }
*/
  await order.save();
  return { success: true };
};
