require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/adminModel');

async function createAdmin() {
  try {
    console.log('Starting script...');

    await mongoose.connect('mongodb://127.0.0.1:27017/LuxeCarry');

    console.log(' DB Connected');

    const existingAdmin = await Admin.findOne({
      email: process.env.ADMIN_EMAIL,
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
    });

    await admin.save();

    console.log('Admin created successfully');

    process.exit();
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

createAdmin();
