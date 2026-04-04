
const express = require('express');
const router = express.Router();
const passport = require("passport");

const userController = require('../controllers/userController');

const {
  isUserAuth,
  redirectIfUserLoggedIn
} = require('../middleware/userAuth');

const noCache = require('../middleware/noCache');

// LOGIN
router.get('/login', noCache, redirectIfUserLoggedIn, userController.showLogin);
router.post('/login', noCache, userController.loginUser);

// SIGNUP
router.get('/signup', noCache, redirectIfUserLoggedIn, userController.showRegister);
router.post('/signup', noCache, userController.registerUser);

// GOOGLE
router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/user/login" }),noCache,
  userController.googleSuccess
);

const protectedRoutes = [
  '/home',
  '/profile',
  '/editProfile',
  '/changePassword',
  '/addresses',
  '/addAddress',
  '/editAddress/:id'
];

protectedRoutes.forEach(route => {
  router.use(route, noCache, isUserAuth);
});

// HOME
router.get('/home', userController.userHome);

// OTP
router.get('/verifyOtp', noCache, userController.showVerifyOTP);
router.post('/verifyOtp', noCache, userController.verifyOTP);
router.post('/resendOtp', noCache, userController.resendOTP);

// FORGOT PASSWORD
router.get('/forgotPassword', userController.showForgotPassword);
router.post('/forgotPassword', userController.sendOTP);
router.get('/resetPassword', userController.showResetPassword);
router.post('/resetPassword', userController.resetPassword);

// PROFILE
router.get("/profile", isUserAuth, userController.profilePage);
router.get("/editProfile", isUserAuth, userController.loadEditProfile);
router.post("/editProfile", isUserAuth, userController.updateProfile);

// PASSWORD
router.get("/changePassword", isUserAuth, userController.loadChangePassword);
router.post("/changePassword", isUserAuth, userController.changePassword);

// ADDRESS
router.get("/addresses", isUserAuth, userController.loadAddresses);
router.get("/addAddress", isUserAuth, userController.loadAddAddress);
router.post("/addAddress", isUserAuth, userController.addAddress);

router.get("/editAddress/:id", isUserAuth, userController.loadEditAddress);
router.post("/editAddress/:id", isUserAuth, userController.updateAddress);
router.post("/deleteAddress/:id", isUserAuth, userController.deleteAddress);

// LOGOUT
router.get('/logout', noCache, userController.userLogout);

module.exports = router;
