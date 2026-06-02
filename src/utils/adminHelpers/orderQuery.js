const User = require('../../models/userModel');

exports.buildOrderQuery = async ({ search = '', status = '', dateRange = '' }) => {
  const query = {};

  // STATUS FILTER
  if (status && status !== 'All') {
    query['items.status'] = status;
  }

  // DATE FILTER
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
