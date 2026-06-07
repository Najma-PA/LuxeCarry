const User = require('../../models/userModel');

exports.buildOrderQuery = async ({
  search = '',
  status = '',
  dateRange = '',
  customStartDate = '',
  customEndDate = '',
}) => {
  const query = {};

  // STATUS FILTER
  if (status && status !== 'All') {
    query['items.status'] = status;
  }
  // DATE FILTER

  if (dateRange && dateRange !== 'All') {
    const now = new Date();

    let startDate;
    let endDate;

    switch (dateRange) {
      case 'Today':
        startDate = new Date();

        startDate.setHours(0, 0, 0, 0);

        endDate = new Date();

        endDate.setHours(23, 59, 59, 999);

        break;

      case 'Yesterday':
        startDate = new Date();

        startDate.setDate(now.getDate() - 1);

        startDate.setHours(0, 0, 0, 0);

        endDate = new Date();

        endDate.setDate(now.getDate() - 1);

        endDate.setHours(23, 59, 59, 999);

        break;

      case 'Last 7 Days':
        startDate = new Date();

        startDate.setDate(now.getDate() - 7);

        endDate = new Date();

        break;

      case 'Last 30 Days':
        startDate = new Date();

        startDate.setDate(now.getDate() - 30);

        endDate = new Date();

        break;

      case 'This Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);

        endDate = new Date();

        break;

      case 'This Year':
        startDate = new Date(now.getFullYear(), 0, 1);

        endDate = new Date();

        break;

      case 'Custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);

          endDate = new Date(customEndDate);

          endDate.setHours(23, 59, 59, 999);
        }

        break;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: startDate,

        $lte: endDate,
      };
    }
  }
  /* // DATE FILTER
  if (dateRange && dateRange !== 'All') {
    const now = new Date();

    let startDate = new Date();

    if (dateRange === 'Today') {
      startDate.setHours(0, 0, 0, 0);

      query.createdAt = {
        $gte: startDate,
      };
    } else if (dateRange === 'Yesterday') {
      const yesterdayStart = new Date();

      yesterdayStart.setDate(now.getDate() - 1);

      yesterdayStart.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date();

      yesterdayEnd.setDate(now.getDate() - 1);

      yesterdayEnd.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: yesterdayStart,
        $lte: yesterdayEnd,
      };
    } else if (dateRange === 'Last 7 Days') {
      startDate.setDate(now.getDate() - 7);

      query.createdAt = {
        $gte: startDate,
      };
    } else if (dateRange === 'Last 30 Days') {
      startDate.setDate(now.getDate() - 30);

      query.createdAt = {
        $gte: startDate,
      };
    }
  }
*/
  // SEARCH FILTER
  if (search) {
    let trimmedSearch = search.trim();

    if (trimmedSearch.startsWith('#')) {
      trimmedSearch = trimmedSearch.substring(1);
    }

    const matchedUsers = await User.find({
      name: {
        $regex: trimmedSearch,
        $options: 'i',
      },
    }).select('_id');

    const userIds = matchedUsers.map((u) => u._id);

    query.$or = [
      {
        orderId: {
          $regex: trimmedSearch,
          $options: 'i',
        },
      },
      {
        'items.productName': {
          $regex: trimmedSearch,
          $options: 'i',
        },
      },
    ];

    if (/^[0-9a-fA-F]{24}$/.test(trimmedSearch)) {
      query.$or.push({
        _id: trimmedSearch,
      });
    }

    if (userIds.length > 0) {
      query.$or.push({
        userId: {
          $in: userIds,
        },
      });
    }
  }

  return query;
};
