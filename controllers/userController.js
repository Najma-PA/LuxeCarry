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
    if (req.user.isBlocked) {
      return req.session.destroy(() => {
        res.render('user/login', { error: 'Account blocked' });
      });
    }

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

/*  VERIFY OTP */
exports.showVerifyOTP = (req, res) => {
  res.render('user/verifyOtp', {
    error: null,
    message: null,
    otpExpire: req.session.otpExpire || 0
  });
};

exports.verifyOTP = async (req, res) => {
  const { otp } = req.body;

  if (!otp || otp.length !== 6) {
    return res.render('user/verifyOtp', {
      error: "Please enter valid OTP",
      message: null,
      otpExpire: req.session.otpExpire || 0
    });
  }

  if (Date.now() > req.session.otpExpire) {
    return res.render('user/verifyOtp', {
      error: "OTP expired",
      message: null,
      otpExpire: req.session.otpExpire || 0
    });
  }

  if (req.session.emailOTP && otp == req.session.emailOTP) {
    const userId = req.session.user.id;

    await userService.updateUser(userId, {
      email: req.session.newEmail,
      name: req.session.tempName
    });

    req.session.emailOTP = null;
    req.session.newEmail = null;
    req.session.tempName = null;
    req.session.otpExpire = null;

    return res.redirect('/user/profile');
  }

  else if (req.session.signupOTP && otp == req.session.signupOTP) {
    await userService.registerUser(req.session.signupData);

    req.session.signupOTP = null;
    req.session.signupData = null;
    req.session.otpExpire = null;

    return res.redirect('/user/login');
  }

  else if (req.session.resetOTP && otp == req.session.resetOTP) {
    req.session.verified = true;
    req.session.resetOTP = null;
    req.session.otpExpire = null;

    return res.redirect('/user/resetPassword');
  }

  else {
    return res.render('user/verifyOtp', {
      error: "Invalid OTP",
      message: null,
      otpExpire: req.session.otpExpire || 0
    });
  }
};


/*RESEND OTP*/
exports.resendOTP = async (req, res) => {

  let email = req.session.resetEmail;

  if (req.session.signupData) email = req.session.signupData.email;
  if (req.session.newEmail) email = req.session.newEmail;

  if (!email) return res.redirect('/user/login');

  const otp = generateOtp();

if (req.session.resetEmail) {
  req.session.resetOTP = otp;
}

if (req.session.signupData) {
  req.session.signupOTP = otp;
}

if (req.session.newEmail) {
  req.session.emailOTP = otp;
}
  req.session.otpExpire = Date.now() + 5 * 60 * 1000;

  await emailService.sendOTP(email, otp);

  res.render('user/verifyOtp', {
    message: "OTP resent",
    error: null,
    otpExpire: req.session.otpExpire || 0
  });
};

/* RESET PASSWORD */
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
  req.session.verified = null;

  res.redirect('/user/login');
};

/*REGISTER */
exports.showRegister = (req, res) => {
  res.render('user/signup', { error: null, errors: {} });
};

exports.registerUser = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  
   // Regex patterns
  const nameRegex = /^[A-Za-z\s]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/;

  // Name validation
  if (!nameRegex.test(name)) {
    return res.render('user/signup', {
      error: "Name should contain only letters and spaces", errors: {}
    });
  }

  // Email validation
  if (!emailRegex.test(email)) {
    return res.render('user/signup', {
      error: "Invalid email format", errors: {}
    });
  }

  // Password validation
  if (!passwordRegex.test(password)) {
    return res.render('user/signup', {
      error: "Password must be at least 6 characters and include uppercase, lowercase, and a special character", errors: {}
    });
  }
  if (password !== confirmPassword) {
    return res.render('user/signup', { error: "Passwords do not match", errors: {} });
  }

  const existingUser = await userService.findUserByEmail(email);

  if (existingUser) {
    return res.render('user/signup', { error: "Email exists", errors: {} });
  }

  const otp = generateOtp();

  req.session.signupData = { name, email, password };
  req.session.signupOTP = otp;
  req.session.otpExpire = Date.now() + 5 * 60 * 1000;

  await emailService.sendOTP(email, otp);

  res.redirect('/user/verifyOtp');
};

/* HOME */
exports.userHome = (req, res) => {
  res.render('user/home', { title: 'Home', user: req.session.user });
};

/* PROFILE*/
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

/*CHANGE PASSWORD */
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

/*ADDRESS*/
exports.loadAddresses = async (req, res) => {
  const addresses = await Address.find({ userId: req.session.user.id })
    .sort({ isDefault: -1, createdAt: -1 });
  res.render("user/addresses", { addresses });
};
exports.loadAddAddress = (req, res) => {
  res.render("user/addAddress");
};

exports.addAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const isDefaultChecked = req.body.defaultAddress === 'on';

    //Check if user already has address
    const existingAddresses = await Address.find({ userId });

    let isDefault = false;

    // Case 1: First address → auto default
    if (existingAddresses.length === 0) {
      isDefault = true;
    }

    // Case 2: User selected default
    if (isDefaultChecked) {
      isDefault = true;

      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );
    }

    await Address.create({
      ...req.body,
      userId,
      isDefault
    });

    res.redirect("/user/addresses");

  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
};

exports.loadEditAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.redirect("/user/addresses");
    }

    res.render("user/editAddress", { address });

  } catch (error) {
    console.error(error);
    res.redirect("/user/addresses");
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const isDefaultChecked = req.body.defaultAddress === 'on';

    let updateData = { ...req.body };
    updateData.isDefault = isDefaultChecked;

    const existingAddress = await Address.findById(req.params.id);

    // If user is removing the default status from the currently default address
    if (!isDefaultChecked && existingAddress.isDefault) {
      // Find other addresses sorted by latest first
      const remainingAddresses = await Address.find({ userId, _id: { $ne: req.params.id } })
        .sort({ createdAt: -1 });

      if (remainingAddresses.length > 0) {
        // Make the most recently added address the new default
        const latest = remainingAddresses[0];
        await Address.updateOne(
          { _id: latest._id },
          { $set: { isDefault: true } }
        );
      } else {
        // If it's the only address, force it to remain default
        updateData.isDefault = true;
      }
    } else if (isDefaultChecked) {
      // If setting this as default, remove default from all others
      await Address.updateMany(
        { userId, _id: { $ne: req.params.id } },
        { $set: { isDefault: false } }
      );
    }

    await Address.findByIdAndUpdate(req.params.id, updateData);

    res.redirect("/user/addresses");

  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Find the address to delete
    const address = await Address.findOne({
      _id: req.params.id,
      userId
    });

    //Delete it
    await Address.findOneAndDelete({
      _id: req.params.id,
      userId
    });

    // If deleted was default
    if (address?.isDefault) {

      // Get ALL remaining addresses sorted
      const remainingAddresses = await Address.find({ userId })
        .sort({ createdAt: -1 });

      console.log("Remaining:", remainingAddresses.length);

      if (remainingAddresses.length > 0) {

        // Pick latest
        const latest = remainingAddresses[0];

        //Force update
        await Address.updateOne(
          { _id: latest._id },
          { $set: { isDefault: true } }
        );

        console.log("New default:", latest._id);
      }
    }

    res.redirect("/user/addresses");

  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
};


//LOGOUT
exports.userLogout = (req, res) => {
  req.session.destroy(() => { 
    res.redirect('/');
  });
}; 
