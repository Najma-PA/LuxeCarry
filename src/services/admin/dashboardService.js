const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Categories = require('../../models/categoryModel');
exports.getdashboardData = async () => {
  const revenueResult = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'Paid',
      },
    },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
  ]);
  const totalOrders = await Order.countDocuments();
  const totalUsers = await User.countDocuments({ role: 'user' });
  const totalProducts = await Product.countDocuments();
  const topcategories = await Categories.find().limit(5);
  const topProducts = await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.finalPayable' },
        name: { $first: '$items.productName' },
        image: { $first: '$items.productImage' },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);
  const topCategories = await Order.aggregate([
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDoc'
      }
    },
    { $unwind: '$productDoc' },
    {
      $lookup: {
        from: 'categories',
        localField: 'productDoc.category',
        foreignField: '_id',
        as: 'categoryDoc'
      }
    },
    { $unwind: '$categoryDoc' },
    {
      $group: {
        _id: '$categoryDoc._id',
        name: { $first: '$categoryDoc.name' },
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.finalPayable' }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 }
  ]);
  // Order Status Distribution
  const orderStatusCounts = await Order.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const orderStatusData = {
    labels: orderStatusCounts.map(item => item._id || 'Unknown'),
    data: orderStatusCounts.map(item => item.count)
  };

  // Monthly Revenue for Current Year
  const currentYear = new Date().getFullYear();
  const revenueByMonth = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'Paid',
        createdAt: {
          $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
          $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const monthlyRevenue = new Array(12).fill(0);
  revenueByMonth.forEach(item => {
    monthlyRevenue[item._id - 1] = item.totalRevenue;
  });
  
  return {
    stats: {
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      totalOrders,
      totalUsers,
      totalProducts,
    },
    topProducts,
    topCategories,
    orderStatusData,
    monthlyRevenue
  };
};
