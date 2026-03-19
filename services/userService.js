const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

exports.findUserByEmail = (email) =>
  User.findOne({ email, role: 'user' });

exports.registerUser = async ({ name, email, password, referredBy }) => {
    const exists = await User.findOne({ email });
  if (exists) throw new Error('Email already registered');
  const hashedPassword = await bcrypt.hash(password,10);

  const referralCode = Math.random().toString(36).substring(2,8).toUpperCase();

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    referralCode,
    referredBy
  });

  return await newUser.save();
};
exports.validatePassword = (plain, hashed) =>
  bcrypt.compare(plain, hashed);

exports.findUserById = (id)=>User.findById(id);

exports.updateUser = (id,data)=>
User.findByIdAndUpdate(id,data);

exports.updatePassword = async (email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate({ email, role: 'user' }, { password: hashedPassword });
};