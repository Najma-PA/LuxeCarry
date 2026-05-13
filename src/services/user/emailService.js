const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  port:587,
  secure:false,
  requireTLS:true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendOTP = async (email, otp) => {

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "LuxeCarry Password Reset OTP",
    text: `Your OTP is ${otp}`,
    
  });
  
};