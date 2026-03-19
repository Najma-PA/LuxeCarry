const adminService = require('../services/adminService');
const bcrypt = require('bcryptjs');

/*AUTH */

exports.showAdminLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    error: null
  });
};

exports.adminLogin = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Please enter admin credentials'
      });
    }

    const admin = await adminService.findAdminByEmail(email);

    if (!admin) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials'
      });
    }

    req.session.admin = {
      id: admin._id,
      email: admin.email
    };

    res.redirect('/admin/dashboard');

  } catch (err) {
    console.error(err);
    res.render('admin/login', {
      title: 'Admin Login',
      error: 'Login failed'
    });
  }
};

exports.adminLogout = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.redirect('/admin/dashboard');
    res.clearCookie('admin_session');
    res.redirect('/admin/login');
  });
};

/*DASHBOARD*/

exports.adminDashboard = async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      admin: req.session.admin
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


/*USER MANAGEMENT*/

exports.loadUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";

    const { users, totalPages } = await adminService.getUsers({
      page,
      limit,
      search
    });

    res.render("admin/users", {
      title: "Users",
      users,
      currentPage: page,
      totalPages,
      search
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

//block/unblock user
exports.toggleUser = async (req, res) => {
  try {
    const user = await adminService.toggleUserBlock(req.params.id);

    res.json({
      success: true,
      isBlocked: user.isBlocked
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};