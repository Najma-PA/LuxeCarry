const Admin = require('../../models/adminModel');
const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
exports.getUsers = async ({ page, limit, search, status }) => {
  const query = {
    $or: [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ],
  };

  if (status === 'Active') {
    query.isBlocked = false;
  } else if (status === 'Blocked') {
    query.isBlocked = true;
  }

  const totalUsers = await User.countDocuments(query);

  let users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  for (let user of users) {
    user.ordersCount = await Order.countDocuments({ userId: user._id });
  }

  return {
    users,
    totalPages: Math.ceil(totalUsers / limit),
  };
};
/**
 *this method is to block user
 * @param {*} userId
 * @returns
 */
exports.toggleUserBlock = async (userId) => {
  const user = await User.findById(userId);

  if (!user) throw new Error('User not found');

  user.isBlocked = !user.isBlocked;
  await user.save();

  return user;
};

exports.findAdminByEmail = async (email) => {
  return await Admin.findOne({ email });
};
