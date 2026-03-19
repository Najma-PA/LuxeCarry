const Admin = require('../models/adminModel');
const User = require('../models/userModel');
exports.getUsers = async ({ page, limit, search }) => {

  const query = {
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ]
  };

  const totalUsers = await User.countDocuments(query);

  const users = await User.find(query)
    .sort({ createdAt: -1 }) // latest first
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    users,
    totalPages: Math.ceil(totalUsers / limit)
  };
};


exports.toggleUserBlock = async (userId) => {
  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  user.isBlocked = !user.isBlocked;
  await user.save();

  return user;
};

exports.findAdminByEmail = async (email) => {
  return await Admin.findOne({ email });
};
