
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
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

module.exports = router;