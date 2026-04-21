
const express = require('express');
const router = express.Router();
const passport = require("passport");

const userController = require('../controllers/userController');
const userProductController = require('../controllers/userProductController');
const cartController = require('../controllers/cartController');
const checkoutController = require('../controllers/checkoutController');
const wishlistController = require('../controllers/wishlistController');
const upload = require('../middleware/multer');
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

//shop
router.get('/shop', userProductController.loadShop);

// Product Details
router.get('/product/:id', userProductController.loadProductDetails);

// Wishlist
router.get('/wishlist', isUserAuth, wishlistController.showWishlist);
router.patch('/wishlist/toggle', isUserAuth, wishlistController.toggleWishlist);
router.delete('/wishlist/:productId', isUserAuth, wishlistController.removeItem);

// Add to cart
router.get('/cart/add/:id', isUserAuth, cartController.addToCart);

// Get cart page
router.get('/cart', isUserAuth, cartController.getCart);

// Checkout
router.get('/checkout', isUserAuth, checkoutController.getCheckoutPage);

// Update quantity
router.patch('/cart/update/:id', isUserAuth, cartController.updateQuantity);

// Remove item
router.delete('/cart/item/:id', isUserAuth, cartController.removeItem);


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
router.post("/profile/update-picture", isUserAuth, upload.single('profilePic'), userController.updateProfilePic);
router.post("/profile/remove-picture", isUserAuth, userController.removeProfilePic);

// PASSWORD
router.get("/changePassword", isUserAuth, userController.loadChangePassword);
router.post("/changePassword", isUserAuth, userController.changePassword);

// ADDRESS
router.get("/addresses", isUserAuth, userController.loadAddresses);
router.get("/addAddress", isUserAuth, userController.loadAddAddress);
router.post("/addAddress", isUserAuth, userController.addAddress);

router.get("/editAddress/:id", isUserAuth, userController.loadEditAddress);
router.post("/editAddress/:id", isUserAuth, userController.updateAddress);
router.delete("/addresses/:id", isUserAuth, userController.deleteAddress);

// LOGOUT
router.get('/logout', noCache, userController.userLogout);

module.exports = router;
