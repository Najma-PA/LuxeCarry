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
exports.cancelOrder = async (orderId, userId, reason) => {
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
  if (order.status !== 'Pending' && order.status !== 'Confirmed') {
    return { success: false, message: 'Order cannot be cancelled' };
  }

  //Restore variant stock
  for (const item of order.items) {
    if (item.variant) {
      await Product.updateOne(
        {
          _id: item.product._id,
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
        { _id: item.product._id },
        {
          $inc: {
            stock: item.quantity,
          },
        }
      );
    }
  }
  order.status = 'Cancelled';
  if (reason) {
    order.cancelReason = reason;
  }
  await order.save();
  return { success: true };
};
exports.returnOrder = async (orderId, userId, reason) => {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    return { success: false, message: 'Order not found' };
  }
  if (order.status !== 'Delivered') {
    return { success: false, message: 'Return not allowed' };
  }
  order.status = 'Returned';
  order.returnReason = reason;
  await order.save();
  return { success: true };
};
