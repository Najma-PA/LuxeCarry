const Order = require('../../models/orderModel');

const { buildOrderQuery } = require('../../utils/adminHelpers/orderQuery');

exports.getSalesReport = async (queryParams) => {
  const {
    search = '',

    reportFilter = '',

    customStartDate = '',

    customEndDate = '',

    page = 1,

    limit = 10,
  } = queryParams;

  // BUILD FILTER QUERY

  const query = await buildOrderQuery({
    search,

    dateRange: reportFilter,

    customStartDate,

    customEndDate,
  });

  // SUMMARY AGGREGATION
  const summaryData = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$finalAmount' },
        couponDiscount: { $sum: '$couponDiscount' },
        totalOrders: { $sum: 1 }
      }
    }
  ]);

  const summary = summaryData[0] || {
    totalSales: 0,
    couponDiscount: 0,
    totalOrders: 0
  };

  summary.netRevenue = summary.totalSales - summary.couponDiscount;

  // FETCH PAGINATED ORDERS
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const orders = await Order.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalPages = Math.ceil(summary.totalOrders / limitNum);

  return {
    orders,
    summary,
    currentPage: pageNum,
    totalPages
  };
};
