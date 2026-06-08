const User = require('../../models/userModel');

exports.buildOrderQuery = async ({
  search = '',
  status = '',
  dateRange = '',
  customStartDate = '',
  customEndDate = '',
}) => {
  const query = {};

  if (status && status !== 'All') {
    query['items.status'] = status;
  }
  //datefilter
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
          startDate.setHours(0, 0, 0, 0);

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
