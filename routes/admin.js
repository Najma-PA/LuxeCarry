
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const controller = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const upload = require('../middleware/multer');

const {
  isAdminAuth,
  redirectIfAdminLoggedIn
} = require('../middleware/adminAuth');

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

router.post('/users/toggle/:id', noCache, isAdminAuth, adminController.toggleUser);

//Category management
router.get('/categories', noCache, isAdminAuth,controller.getCategories);

router.get('/categories/add', noCache, isAdminAuth,controller.loadAddPage);
router.post('/categories/add', noCache, isAdminAuth, upload.single('image'), controller.addCategory);

router.get('/categories/edit/:id', noCache, isAdminAuth,controller.loadEditPage);
router.post('/categories/edit/:id', noCache, isAdminAuth, upload.single('image'), controller.updateCategory);

router.get('/categories/delete/:id',noCache, isAdminAuth, controller.deleteCategory);

//Product management
router.get('/products',noCache, isAdminAuth, productController.getProducts);
router.get('/products/add',noCache, isAdminAuth, productController.loadAddPage);
router.post('/products/add',upload.array('images', 5),noCache, isAdminAuth,productController.addProduct);

router.get('/products/edit/:id',noCache, isAdminAuth, productController.loadEditPage);

router.post('/products/edit/:id',upload.array('images', 5),noCache, isAdminAuth,productController.updateProduct);

router.get('/products/delete/:id',noCache, isAdminAuth, productController.deleteProduct);

module.exports = router;