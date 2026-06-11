const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');

const { buildOrderQuery } = require('../../utils/adminHelpers/orderQuery');

const { buildRevenueQuery } = require('../../utils/adminHelpers/revenueQuery');

const revenueQuery = buildRevenueQuery();

exports.getdashboardData = async (filter = 'This Year') => {
  const dateQuery = await buildOrderQuery({ dateRange: filter });
  const query = { ...dateQuery, ...revenueQuery };
  const revenueResult = await Order.aggregate([
    {
      $match: query,
      //paymentStatus: 'Paid',
    },
    { $project: { totalAmount: 1, refundTotal: { $sum: '$items.refundAmount' } } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalRefunds: { $sum: '$refundTotal' },
      },
    },
  ]);

  const totalRevenue = (revenueResult[0]?.totalSales || 0) - (revenueResult[0]?.totalRefunds || 0);

  const totalOrders = await Order.countDocuments(query);
  const totalUsers = await User.countDocuments({ role: 'user' });
  const totalProducts = await Product.countDocuments();

  const topProducts = await Order.aggregate([
    { $match: query },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.quantity' },

        revenue: {
          $sum: {
            $subtract: [
              '$items.finalPayable',

              {
                $ifNull: ['$items.refundAmount', 0],
              },
            ],
          },
        },

        // revenue: { $sum: '$items.finalPayable' },
        name: { $first: '$items.productName' },
        image: { $first: '$items.productImage' },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);
  const topCategories = await Order.aggregate([
    { $match: query },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: '$productDoc' },
    {
      $lookup: {
        from: 'categories',
        localField: 'productDoc.category',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $unwind: '$categoryDoc' },
    {
      $group: {
        _id: '$categoryDoc._id',
        name: { $first: '$categoryDoc.name' },
        totalSold: { $sum: '$items.quantity' },

        revenue: {
          $sum: {
            $subtract: [
              '$items.finalPayable',

              {
                $ifNull: ['$items.refundAmount', 0],
              },
            ],
          },
        },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);

  const orderStatusCounts = await Order.aggregate([
    { $match: dateQuery },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const orderStatusData = {
    labels: orderStatusCounts.map((item) => item._id || 'Unknown'),
    data: orderStatusCounts.map((item) => item.count),
  };

  const currentYear = new Date().getFullYear();

  let groupId = {};
  let labels = [];

  if (filter === 'Today') {
    groupId = {
      hour: { $hour: '$createdAt' },
    };
  } else if (filter === 'Last 7 Days' || filter === 'This Month') {
    groupId = {
      day: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$createdAt',
        },
      },
    };
  } else {
    // This Year
    groupId = {
      day: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$createdAt',
        },
      },
    };
  }

  const revenueChartData = await Order.aggregate([
    {
      $match: query,
    },

    {
      $project: {
        createdAt: 1,

        totalAmount: 1,

        refundTotal: {
          $sum: '$items.refundAmount',
        },
      },
    },

    {
      $group: {
        _id: groupId,

        revenue: {
          $sum: {
            $subtract: ['$totalAmount', '$refundTotal'],
          },
        },
      },
    },

    {
      $sort: {
        '_id.day': 1,
        '_id.hour': 1,
        '_id.month': 1,
      },
    },
  ]);

  let revenueLabels = [];
  let revenueValues = [];

  if (filter === 'Today') {
    revenueLabels = revenueChartData.map((item) => `${item._id.hour}:00`);
  } else if (filter === 'Last 7 Days' || filter === 'This Month') {
    revenueLabels = revenueChartData.map((item) => item._id.day);
  } else {
    revenueLabels = revenueChartData.map((item) => item._id.day);
  }
  revenueValues = revenueChartData.map((item) => item.revenue);

  return {
    stats: {
      totalRevenue,
      totalOrders,
      totalUsers,
      totalProducts,
    },

    topProducts,
    topCategories,
    orderStatusData,

    revenueLabels,
    revenueValues,
  };
};
