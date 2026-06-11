const Order = require('../../models/orderModel');

const { buildOrderQuery } = require('../../utils/adminHelpers/orderQuery');

const { buildRevenueQuery } = require('../../utils/adminHelpers/revenueQuery');

exports.getSalesReport = async (queryParams) => {
  const {
    search = '',

    reportFilter = '',

    customStartDate = '',

    customEndDate = '',

    page = 1,

    limit = 10,
  } = queryParams;

  const baseQuery = await buildOrderQuery({
    search,

    dateRange: reportFilter,

    customStartDate,

    customEndDate,
  });

  const revenueQuery = buildRevenueQuery();

  const query = {
    ...baseQuery,

    ...revenueQuery,
  };

  const pageNum = parseInt(page) || 1;

  const isAll = limit === 'all';

  const limitNum = isAll ? 0 : parseInt(limit) || 10;

  const skip = isAll ? 0 : (pageNum - 1) * limitNum;

  const summaryData = await Order.aggregate([
    {
      $match: query,
    },

    {
      $project: {
        totalAmount: 1,

        couponDiscountTotal: {
          $sum: '$items.couponDiscount',
        },

        refundTotal: {
          $sum: '$items.refundAmount',
        },
      },
    },

    {
      $group: {
        _id: null,

        totalSales: {
          $sum: '$totalAmount',
        },

        couponDiscount: {
          $sum: '$couponDiscountTotal',
        },

        totalRefunds: {
          $sum: '$refundTotal',
        },

        totalOrders: {
          $sum: 1,
        },
      },
    },
  ]);

  const summary = summaryData[0] || {
    totalSales: 0,

    couponDiscount: 0,

    totalRefunds: 0,

    totalOrders: 0,
  };

  //netrevenue

  summary.netRevenue = summary.totalSales - summary.totalRefunds;

  //fetchorders

  let queryBuilder = Order.find(query)

    .populate('userId', 'name email')

    .sort({
      createdAt: -1,
    });

  if (!isAll) {
    queryBuilder = queryBuilder.skip(skip).limit(limitNum);
  }

  const orders = await queryBuilder;

  //totalpages

  const totalPages = isAll ? 1 : Math.ceil(summary.totalOrders / limitNum);

  return {
    orders,

    summary,

    currentPage: pageNum,

    totalPages,
  };
};
