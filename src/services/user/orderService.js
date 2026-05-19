const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
exports.getUserOrders = async (userId) => {
  const orders = await Order.find({ userId }).populate('items.product').sort({ createdAt: -1 });
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

  const item = order.items.id(itemId) || order.items.find(i => i._id.toString() === itemId.toString());

  if (!item) {
    return {
      success: false,
      message: 'Item not found in order',
    };
  }

  if (item.status !== 'Pending' && item.status !== 'Confirmed') {
    return { success: false, message: 'Item cannot be cancelled at this stage' };
  }

  // Restore variant/product stock ONLY for this item
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

  item.status = 'Cancelled';
  item.cancelReason = reason || '';
  item.cancelledAt = new Date();

  // Refund fields
  if (order.paymentStatus === 'Paid') {
    item.refundAmount = item.totalPrice || (item.finalPrice * item.quantity);
    item.refundStatus = 'Pending';
  }

  // Check if all items are cancelled to update the orderStatus
  const allCancelled = order.items.every(i => i.status === 'Cancelled');
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

  const item = order.items.id(itemId) || order.items.find(i => i._id.toString() === itemId.toString());

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

  item.status = 'Returned';
  item.returnReason = finalReason || '';
  item.returnedAt = new Date();

  // Restore stock ONLY for returned item, IF reason is NOT Damaged Product
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

  // Refund fields
  if (order.paymentStatus === 'Paid') {
    item.refundAmount = item.totalPrice || (item.finalPrice * item.quantity);
    item.refundStatus = 'Pending';
  }

  // Check if all items are returned or cancelled to update global orderStatus
  const allReturnedOrCancelled = order.items.every(i => i.status === 'Returned' || i.status === 'Cancelled');
  if (allReturnedOrCancelled) {
    order.orderStatus = 'Returned';
  }

  await order.save();
  return { success: true };
};
