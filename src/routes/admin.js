const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/adminController');
const controller = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const bannerController = require('../controllers/admin/bannerController');
const orderController = require('../controllers/admin/orderController');
const { upload, handleMulterError } = require('../middleware/multer');

const { isAdminAuth, redirectIfAdminLoggedIn } = require('../middleware/adminAuth');

const noCache = require('../middleware/noCache');

/*AUTH*/

router.get('/login', noCache, redirectIfAdminLoggedIn, adminController.showAdminLogin);

router.post('/login', noCache, redirectIfAdminLoggedIn, adminController.adminLogin);

router.post('/logout', noCache, isAdminAuth, adminController.adminLogout);

/*DASHBOARD */

router.get('/dashboard', noCache, isAdminAuth, adminController.adminDashboard);

/* USER MANAGEMENT */

router.get('/users', noCache, isAdminAuth, adminController.loadUsers);

router.get('/users/add', noCache, isAdminAuth, adminController.loadAddUser);

router.patch('/users/toggle/:id', noCache, isAdminAuth, adminController.toggleUser);

//Category management
router.get('/categories', noCache, isAdminAuth, controller.getCategories);

router.get('/categories/add', noCache, isAdminAuth, controller.loadAddPage);
router.post(
  '/categories/add',
  noCache,
  isAdminAuth,
  handleMulterError(upload.single('image')),
  controller.addCategory
);

router.get('/categories/edit/:id', noCache, isAdminAuth, controller.loadEditPage);
router.post(
  '/categories/edit/:id',
  noCache,
  isAdminAuth,
  handleMulterError(upload.single('image')),
  controller.updateCategory
);

router.patch('/categories/toggle/:id', noCache, isAdminAuth, controller.toggleCategoryStatus);
router.delete('/categories/:id', noCache, isAdminAuth, controller.deleteCategory);
router.patch('/categories/restore/:id', noCache, isAdminAuth, controller.restoreCategory);

//Product management
router.get('/products', noCache, isAdminAuth, productController.getProducts);
router.get('/products/add', noCache, isAdminAuth, productController.loadAddPage);
router.post(
  '/products/add',
  noCache,
  isAdminAuth,
  handleMulterError(upload.any()),
  productController.addProduct
);

router.get('/products/edit/:id', noCache, isAdminAuth, productController.loadEditPage);

router.post(
  '/products/edit/:id',
  noCache,
  isAdminAuth,
  handleMulterError(upload.any()),
  productController.updateProduct
);

router.delete('/products/:id', noCache, isAdminAuth, productController.deleteProduct);
router.patch('/products/restore/:id', noCache, isAdminAuth, productController.restoreProduct);
// Banner Management
router.get('/banners', noCache, isAdminAuth, bannerController.getBanners);
router.get('/banners/add', noCache, isAdminAuth, bannerController.loadAddPage);
router.post(
  '/banners/add',
  noCache,
  isAdminAuth,
  handleMulterError(upload.single('image')),
  bannerController.addBanner
);
router.patch('/banners/toggle/:id', noCache, isAdminAuth, bannerController.toggleStatus);
router.delete('/banners/:id', noCache, isAdminAuth, bannerController.deleteBanner);

/* ORDER MANAGEMENT */
router.get('/orders', noCache, isAdminAuth, orderController.getOrders);
router.get('/orders/:orderId', noCache, isAdminAuth, orderController.getOrderDetails);
router.post('/orders/:orderId/orderStatus', noCache, isAdminAuth, orderController.updateOrderStatus);
router.post('/orders/:orderId/payment', noCache, isAdminAuth, orderController.updateOrderPayment);
router.post('/orders/:orderId/items/:itemId/status', noCache, isAdminAuth, orderController.updateItemStatus);
router.post('/orders/:orderId/items/:itemId/refund', noCache, isAdminAuth, orderController.updateItemRefund);

module.exports = router;
