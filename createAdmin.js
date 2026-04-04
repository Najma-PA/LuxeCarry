const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/adminModel');

async function createAdmin() {
  try {
    console.log("Starting script...");

    await mongoose.connect('mongodb://127.0.0.1:27017/LuxeCarry');

    console.log(" DB Connected");

    const existingAdmin = await Admin.findOne({
      email: 'najmaPA.najma@outlook.com'
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash('Admin123*', 10);

    const admin = new Admin({
      email: 'najmaPA.najma@outlook.com',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();

    console.log("Admin created successfully");

    process.exit();

  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

createAdmin();