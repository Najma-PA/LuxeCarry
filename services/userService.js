const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const path = require('path');
const fs = require('fs');

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
User.findByIdAndUpdate(id,data, { new: true }); // Return new doc to update session

exports.updatePassword = async (email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate({ email, role: 'user' }, { password: hashedPassword });
};

exports.saveProfilePic = (file) => {
  const filename = `profile-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
  const outputPath = path.join('public', 'uploads', 'profile', filename);
  
  if (!fs.existsSync(path.join('public', 'uploads', 'profile'))) {
    fs.mkdirSync(path.join('public', 'uploads', 'profile'), { recursive: true });
  }

  fs.copyFileSync(file.path, outputPath);
  fs.unlinkSync(file.path);
  return `/uploads/profile/${filename}`;
};