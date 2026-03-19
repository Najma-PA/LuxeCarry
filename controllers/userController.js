const userService = require('../services/userService');
const emailService = require('../services/emailService');
const Address = require("../models/addressModel");
const bcrypt = require("bcryptjs");

// OTP generator
function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/*GOOGLE AUTH*/
exports.googleSuccess = (req, res) => {
  if (req.user) {
    req.session.user = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'user'
    };
  }
  res.redirect("/user/home");
};

exports.googleFailure = (req, res) => {
  res.redirect("/user/login");
};

/*LOGIN */
exports.showLogin = (req, res) => {
  if (req.session.user?.role === 'user') return res.redirect('/user/home');
  if (req.session.user?.role === 'admin') return res.redirect('/admin/dashboard');

  res.render('user/login', { error: null });
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('user/login', { error: 'Email and password are required' });
    }

    const user = await userService.findUserByEmail(email);

    if (!user) return res.render('user/login', { error: 'Invalid credentials' });

    if (user.isBlocked) {
      return res.render('user/login', { error: 'Account blocked' });
    }

    const isMatch = await userService.validatePassword(password, user.password);

    if (!isMatch) return res.render('user/login', { error: 'Invalid credentials' });

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: 'user'
    };

    res.redirect('/user/home');

  } catch (err) {
    res.render('user/login', { error: 'Login failed' });
  }
};

/*FORGOT PASSWORD */
exports.showForgotPassword = (req, res) => {
  res.render('user/forgotPassword', { error: null });
};

exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  const user = await userService.findUserByEmail(email);

  if (!user) {
    return res.render('user/forgotPassword', { error: "Invalid email" });
  }

  const otp = generateOtp();

  req.session.resetOTP = otp;
  req.session.resetEmail = email;
  req.session.otpExpire = Date.now() + 5 * 60 * 1000;

  await emailService.sendOTP(email, otp);

  res.redirect('/user/verifyOtp');
};

/* ================= VERIFY OTP (UNIFIED) ================= */
exports.showVerifyOTP = (req, res) => {
  res.render('user/verifyOtp', { error: null, message: null });
};

exports.verifyOTP = async (req, res) => {
  const { otp } = req.body;

  if (Date.now() > req.session.otpExpire) {
    return res.render('user/verifyOtp', {
      error: "OTP expired",
      message: null
    });
  }

  // EMAIL CHANGE
  if (req.session.emailOTP && otp == req.session.emailOTP) {
    const userId = req.session.user.id;

    await userService.updateUser(userId, {
      email: req.session.newEmail,
      name: req.session.tempName
    });

    req.session.user.email = req.session.newEmail;
    req.session.user.name = req.session.tempName;

    req.session.emailOTP = null;
    req.session.newEmail = null;
    req.session.tempName = null;

    return res.redirect('/user/profile');
  }

  // SIGNUP
  if (req.session.signupOTP && otp == req.session.signupOTP) {
    await userService.registerUser(req.session.signupData);

    req.session.signupOTP = null;
    req.session.signupData = null;

    return res.redirect('/user/login');
  }

  // RESET PASSWORD
  if (req.session.resetOTP && otp == req.session.resetOTP) {
    req.session.verified = true;
    return res.redirect('/user/resetPassword');
  }

  res.render('user/verifyOtp', {
    error: "Invalid OTP",
    message: null
  });
};

/*RESEND OTP*/
exports.resendOTP = async (req, res) => {

  let email = req.session.resetEmail;

  if (req.session.signupData) email = req.session.signupData.email;
  if (req.session.newEmail) email = req.session.newEmail;

  if (!email) return res.redirect('/user/login');

  const otp = generateOtp();

  req.session.resetOTP = otp;
  req.session.signupOTP = otp;
  req.session.emailOTP = otp;

  req.session.otpExpire = Date.now() + 5 * 60 * 1000;

  await emailService.sendOTP(email, otp);

  res.render('user/verifyOtp', {
    message: "OTP resent",
    error: null
  });
};

/* ================= RESET PASSWORD ================= */
exports.showResetPassword = (req, res) => {
  if (!req.session.resetEmail) return res.redirect('/user/login');
  res.render('user/resetPassword', { error: null });
};

exports.resetPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('user/resetPassword', { error: "Passwords do not match" });
  }

  await userService.updatePassword(req.session.resetEmail, password);

  req.session.resetEmail = null;

  res.redirect('/user/login');
};

/* ================= REGISTER ================= */
exports.showRegister = (req, res) => {
  res.render('user/signup', { error: null });
};

exports.registerUser = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('user/signup', { error: "Passwords do not match" });
  }

  const existingUser = await userService.findUserByEmail(email);

  if (existingUser) {
    return res.render('user/signup', { error: "Email exists" });
  }

  const otp = generateOtp();

  req.session.signupData = { name, email, password };
  req.session.signupOTP = otp;
  req.session.otpExpire = Date.now() + 5 * 60 * 1000;

  await emailService.sendOTP(email, otp);

  res.redirect('/user/verifyOtp');
};

/* ================= HOME ================= */
exports.userHome = (req, res) => {
  res.render('user/home', { title: 'Home', user: req.session.user });
};

/* ================= PROFILE ================= */
exports.profilePage = async (req, res) => {
  const user = await userService.findUserById(req.session.user.id);
  res.render('user/profile', { user });
};

exports.loadEditProfile = async (req, res) => {
  const user = await userService.findUserById(req.session.user.id);
  res.render('user/editProfile', { user });
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email } = req.body;

    const user = await userService.findUserById(userId);

    if (email === user.email) {
      await userService.updateUser(userId, { name });
      req.session.user.name = name;
      return res.redirect('/user/profile');
    }

    const existingUser = await userService.findUserByEmail(email);

    if (existingUser) {
      return res.render("user/editProfile", {
        user,
        error: "Email already exists"
      });
    }

    const otp = generateOtp();

    req.session.emailOTP = otp;
    req.session.newEmail = email;
    req.session.tempName = name;
    req.session.otpExpire = Date.now() + 5 * 60 * 1000;

    await emailService.sendOTP(email, otp);

    res.redirect("/user/verifyOtp");

  } catch (error) {
    res.render("user/editProfile", { error: "Something went wrong" });
  }
};

/* ================= CHANGE PASSWORD ================= */
exports.loadChangePassword = (req, res) => {
  res.render("user/changePassword", { error: null });
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await userService.findUserById(userId);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render("user/changePassword", { error: "Current password is incorrect" });
    }

    if (newPassword !== confirmPassword) {
      return res.render("user/changePassword", { error: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userService.updateUser(userId, { password: hashedPassword });
    res.redirect("/user/profile");
  } catch (error) {
    console.log(error);
    res.render("user/changePassword", { error: "Something went wrong" });
  }
};

/* ================= ADDRESS ================= */
exports.loadAddresses = async (req, res) => {
  const addresses = await Address.find({ userId: req.session.user.id });
  res.render("user/addresses", { addresses });
};
exports.loadAddAddress = (req, res) => {
  res.render("user/addAddress");
};

exports.addAddress = async (req, res) => {
  const isDefault = req.body.defaultAddress === 'on';

  if (isDefault) {
    await Address.updateMany({ userId: req.session.user.id }, { $set: { isDefault: false } });
  }

  await Address.create({ 
    ...req.body, 
    userId: req.session.user.id,
    isDefault
  });
  res.redirect("/user/addresses");
};

exports.loadEditAddress = async (req, res) => {
  const address = await Address.findById(req.params.id);
  res.render("user/editAddress", { address });
};

exports.updateAddress = async (req, res) => {
  const isDefault = req.body.defaultAddress === 'on';

  if (isDefault) {
    await Address.updateMany({ userId: req.session.user.id }, { $set: { isDefault: false } });
  }

  await Address.findByIdAndUpdate(req.params.id, {
    ...req.body,
    isDefault
  });
  res.redirect("/user/addresses");
};

exports.deleteAddress = async (req, res) => {
  await Address.findByIdAndDelete(req.params.id);
  res.redirect("/user/addresses");
};

/* ================= LOGOUT ================= */
exports.userLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};


/*const { name } = require('ejs');
const userService = require('../services/userService');
const emailService = require('../services/emailService');
const Address = require("../models/addressModel");
const bcrypt = require("bcryptjs");
const env = require('dotenv').config();

//otp generator
function generateOtp(){
  const digits = "1234567890";
  let otp = "";
  for(let i=0;i<6;i++){
    otp += digits[Math.floor(Math.random()*10)];
  }
  return otp;
}


//googleAuth
exports.googleSuccess = (req, res) => {
  if (req.user) {
    req.session.user = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'user'
    };
  }
  res.redirect("/user/home");
};

exports.googleFailure = (req, res) => {
  res.redirect("/user/login");
};

/* LOGIN PAGE 
exports.showLogin = (req, res) => {
  if (req.session.user?.role === 'user') return res.redirect('/user/home');
  if (req.session.user?.role === 'admin') return res.redirect('/admin/dashboard');
  res.render('user/login', { title:'User Login',
    error: null });
};

/* LOGIN 
exports.loginUser = async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('user/login', {
        error: 'Email and password are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('user/login', {
        error: 'Invalid email format'
      });
    }

    if (password.length < 6) {
      return res.render('user/login', {
        error: 'Password must be at least 6 characters'
      });
    }

    // Find user
    const user = await userService.findUserByEmail(email);

    if (!user) {
      return res.render('user/login', {
        error: 'Invalid credentials'
      });
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.render('user/login', {
        error: 'Your account has been blocked by admin'
      });
    }

    // Validate password
    const isMatch = await userService.validatePassword(password, user.password);

    if (!isMatch) {
      return res.render('user/login', {
        error: 'Invalid credentials'
      });
    }

    req.session.user = {
      id: user._id,
      name:user.name,
      email: user.email,
      role: 'user'
    };

    res.redirect('/user/home');

  } catch (err) {

    res.render('user/login', {
      error: 'Login failed'
    });

  }

};

/*forgot password
exports.showForgotPassword = (req,res)=>{
  res.render('user/forgotPassword',{error:null});
};

//send otp
exports.sendOTP = async (req,res)=>{

  const { email } = req.body;

  const user = await userService.findUserByEmail(email);

  if(!user){
    return res.render('user/forgotPassword',{
      error:"Enter valid email"
    });
  }

  const otp = generateOtp();

  req.session.resetOTP = otp;
  req.session.resetEmail = email;
  req.session.otpExpire = Date.now() + 5 * 60 * 1000;

  await emailService.sendOTP(email, otp);

  res.redirect('/user/verifyOtp');
};

//show otp page
exports.showVerifyOTP = (req,res)=>{
  res.render('user/verifyOtp',{error:null,message:null

  });
};

//verify otp
exports.verifyOTP = async (req,res)=>{

  const { otp } = req.body;

  if(Date.now() > req.session.otpExpire){
    return res.render('user/verifyOtp',{
      error:"OTP expired. Please request a new one.",
      message:null
    });
  }

  // ✅ EMAIL CHANGE
  if(req.session.emailOTP && otp == req.session.emailOTP){

    const userId = req.session.user.id;

    await userService.updateUser(userId,{
      email: req.session.newEmail,
      name: req.session.tempName
    });

    req.session.user.email = req.session.newEmail;
    req.session.user.name = req.session.tempName;

    req.session.emailOTP = null;
    req.session.newEmail = null;
    req.session.tempName = null;

    return res.redirect('/user/profile');
  }

  // ✅ SIGNUP
  if(req.session.signupOTP && otp == req.session.signupOTP){

    await userService.registerUser(req.session.signupData);

    req.session.signupOTP = null;
    req.session.signupData = null;

    return res.redirect('/user/login');
  }

  // ✅ RESET PASSWORD
  if(req.session.resetOTP && otp == req.session.resetOTP){

    req.session.verified = true;

    return res.redirect('/user/resetPassword');
  }

  res.render('user/verifyOtp',{
    error:"Invalid OTP",
    message:null
  });
};
/*
exports.verifyOTP = async (req,res)=>{

  const { otp } = req.body;

  if(Date.now() > req.session.otpExpire){
    return res.render('user/verifyOtp',{
      error:"OTP expired. Please request a new one.",
      message:null
    });

    exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email } = req.body;

    const user = await userService.findUserById(userId);

    // EMAIL NOT CHANGED
    if (email === user.email) {
      await userService.updateUser(userId, { name });

      req.session.user.name = name;

      return res.redirect('/user/profile');
    }

    // SAME EMAIL CHECK (extra safety)
    if (email === req.session.user.email) {
      return res.render("user/editProfile", {
        user,
        error: "This is already your current email"
      });
    }

    // CHECK DUPLICATE EMAIL
    const existingUser = await userService.findUserByEmail(email);

    if (existingUser) {
      return res.render("user/editProfile", {
        user,
        error: "Email already exists"
      });
    }

    // SEND OTP
    const otp = generateOtp();

    req.session.emailOTP = otp;
    req.session.newEmail = email;
    req.session.tempName = name;
    req.session.otpExpire = Date.now() + 5 * 60 * 1000;

    await emailService.sendOTP(email, otp);

    res.redirect("/user/verifyOtp");

  } catch (error) {
    console.log(error);

    res.render("user/editProfile", {
      error: "Something went wrong"
    });
  }
};
  

  // SIGNUP OTP
  if(req.session.signupOTP && otp == req.session.signupOTP){

    const data = req.session.signupData;

    await userService.registerUser(data);

    req.session.signupOTP = null;
    req.session.signupData = null;

    return res.redirect('/user/login');
  }

  // RESET PASSWORD OTP
  if(req.session.resetOTP && otp == req.session.resetOTP){

    req.session.verified = true;

    return res.redirect('/user/resetPassword');
  }

  res.render('user/verifyOtp',{
    error:"Invalid OTP",
    message:null
  });



//resend otp
exports.resendOTP = async (req,res)=>{

  let email = req.session.resetEmail;

  if(req.session.signupData){
    email = req.session.signupData.email;
  }

  if(!email){
    return res.redirect('/user/login');
  }

  const otp =generateOtp();

  req.session.resetOTP = otp;
  req.session.signupOTP = otp;
  
  
  req.session.otpExpire = Date.now() + 5 * 60 * 1000;

  await emailService.sendOTP(email, otp);

  res.render('user/verifyOtp',{
    message:"New OTP sent to your email",
    error:null
  });

};

//show reset password
exports.showResetPassword = (req,res)=>{

  if(!req.session.resetEmail){
    return res.redirect('/user/forgotPassword');
  }

  res.render('user/resetPassword',{error:null});
};

//reset pssword
exports.resetPassword = async (req,res)=>{

  const { password, confirmPassword } = req.body;

  if(password !== confirmPassword){
    return res.render('user/resetPassword',{error:"Passwords do not match"});
  }

  const email = req.session.resetEmail;

  await userService.updatePassword(email,password);

  req.session.resetOTP = null;
  req.session.otpExpire = null;
  req.session.resetEmail = null;

  res.redirect('/user/login');

};

/* REGISTER PAGE 
exports.showRegister = (req, res) => {
  res.render('user/signup', { error: null });
};

/* REGISTER 
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword ,referralCode} = req.body;
    // General validation
    if (!name || !email || !password || !confirmPassword) {
      return res.render('user/signup', {
        error: 'All fields are required',
    
      });
    }

    // Name validation (letters + spaces only)
    const nameRegex = /^[A-Za-z\s]{2,}$/;
    if (!nameRegex.test(name)) {
      return res.render('user/signup', {
        error: 'Name should contain only letters and spaces (min 2 characters)'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('user/signup', {
        error: 'Please enter a valid email address'
      });
    }
    //check if emil alredy exist
    const existingUser = await userService.findUserByEmail(email);

if(existingUser){
  return res.render('user/signup',{
    error:"Email already registered"
  });
}
    // Password validation
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

if (!passRegex.test(password)) {
  return res.render('user/signup', {
    error: 'Password must contain at least 6 characters, including uppercase, lowercase, number and special character'
  });
}

    // Confirm password
    if (password !== confirmPassword) {
      return res.render('user/signup', {
        error: 'Passwords do not match'
      });
    }

      /* REFERRAL CODE VALIDATION 

    let referredBy = null;

    if (referralCode && referralCode.trim() !== "") {

      const refUser = await userService.findUserByReferralCode(referralCode);

      if (!refUser) {
        return res.render('user/signup', {
          error: 'Invalid referral code'
        });
      }
      

      referredBy = refUser._id;
    }
    // generate OTP
const otp = generateOtp();

// store signup data temporarily
req.session.signupData = {
  name,
  email,
  password,
  referredBy
};

req.session.signupOTP = otp;
req.session.otpExpire = Date.now() + 5 * 60 * 1000;

// send OTP email
await emailService.sendOTP(email, otp);

// redirect to OTP page
res.redirect('/user/verifyOtp');

  } catch (err) {
    res.render('user/signup', { error: err.message });
  }
};


/* HOME 
exports.userHome = (req, res) => {
  res.render('user/home', { title: 'Home', user: req.session.user });
};

/*profile
exports.profilePage = async (req,res)=>{
  if(!req.session.user){
    return res.redirect("/user/login");
  }


const userId = req.session.user.id;

const user = await userService.findUserById(userId);

res.render('user/profile',{user});

};

/*edit profile page
exports.loadEditProfile = async (req,res)=>{

const userId = req.session.user.id;

const user = await userService.findUserById(userId);

res.render('user/editProfile',{user});

};

//update profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email } = req.body;

    const user = await userService.findUserById(userId);

    // EMAIL NOT CHANGED
    if (email === user.email) {

      await userService.updateUser(userId, { name });

      req.session.user.name = name;

      return res.redirect('/user/profile');
    }

    // EMAIL SAME AS SESSION
    if (email === req.session.user.email) {
      return res.render("user/editProfile", {
        user,
        error: "This is already your current email"
      });
    }

    // DUPLICATE EMAIL CHECK
    const existingUser = await userService.findUserByEmail(email);

    if (existingUser) {
      return res.render("user/editProfile", {
        user,
        error: "Email already exists"
      });
    }

    // SEND OTP
    const otp = generateOtp();

    req.session.emailOTP = otp;
    req.session.newEmail = email;
    req.session.tempName = name;
    req.session.otpExpire = Date.now() + 5 * 60 * 1000;

    await emailService.sendOTP(email, otp);

    res.redirect("/user/verifyOtp");

  } catch (error) {
    console.log(error);

    res.render("user/editProfile", {
      error: "Something went wrong"
    });
  }
};
/*
exports.updateProfile = async (req,res)=>{

const userId = req.session.user.id;
const { name } = req.body;

await userService.updateUser(userId,{name});

req.session.user.name = name;

res.redirect('/user/profile');

};
//load address
exports.loadAddresses = async(req,res)=>{

  const userId = req.session.user.id;

  const addresses = await Address.find({userId});

  res.render("user/addresses",{addresses});

}

//add address
exports.loadAddAddress = (req,res)=>{
    res.render("user/addAddress")
}

exports.addAddress = async (req,res)=>{

  const userId = req.session.user.id;

  const {name,phone,street,city,state,pincode,country} = req.body;

  await Address.create({
    userId,
    name,
    phone,
    street,
    city,
    state,
    pincode,
    country
  });

  res.redirect("/user/addresses");

}

//load edit address
exports.loadEditAddress = async(req,res)=>{

  const addressId = req.params.id;

  const address = await Address.findById(addressId);

  res.render("user/editAddress",{address});

}

//update address
exports.updateAddress = async(req,res)=>{

  const addressId = req.params.id;

  await Address.findByIdAndUpdate(addressId,req.body);

  res.redirect("/user/addresses");

}

//delete address
exports.deleteAddress = async(req,res)=>{

  const addressId = req.params.id;

  await Address.findByIdAndDelete(addressId);

  res.redirect("/user/addresses");

}

//load chng password page
exports.loadChangePassword = (req,res)=>{
    res.render("user/changePassword")
}


exports.changePassword = async (req,res)=>{

  try{

    const userId = req.session.user.id;

    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await userService.findUserById(userId);

    // check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if(!isMatch){
      return res.render("user/changePassword",{
        error:"Current password is incorrect"
      });
    }

    // confirm password validation
    if(newPassword !== confirmPassword){
      return res.render("user/changePassword",{
        error:"Passwords do not match"
      });
    }

    // hash new password
    const hashedPassword = await bcrypt.hash(newPassword,10);

    // update password
    await userService.updateUser(userId,{
      password: hashedPassword
    });

    res.redirect("/user/profile");

  }catch(error){

    console.log(error);

    res.render("user/changePassword",{
      error:"Something went wrong"
    });

  }

};

/* LOGOUT 
exports.userLogout = (req, res) => {

  req.session.destroy(err => {

    if (err) {
      console.log("Logout error:", err);
      return res.redirect('/');
    }

    res.clearCookie('user_session'); // your session cookie name
    res.redirect('/'); // redirect to home page
  });

};
*/