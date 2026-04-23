const adminService = require('../services/adminService');
const bcrypt = require('bcryptjs');

/*AUTH */

exports.showAdminLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    error: null,
    formData: {}
  });
};

exports.adminLogin = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Please enter admin credentials',
        formData: req.body
      });
    }

    const admin = await adminService.findAdminByEmail(email);

    if (!admin) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials',
        formData: req.body
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials',
        formData: req.body
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
      error: 'Login failed',
      formData: req.body
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
    const status = req.query.status || "All Statuses";

    const { users, totalPages } = await adminService.getUsers({
      page,
      limit,
      search,
      status
    });

    // AJAX Hook
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      const tableHtml = await new Promise((resolve, reject) => {
        res.render('partials/admin/user-table', { users }, (err, html) => {
          if (err) reject(err); else resolve(html);
        });
      });

      return res.json({
        success: true,
        tableHtml,
        currentPage: page,
        totalPages
      });
    }

    res.render("admin/users", {
      title: "Users",
      users,
      currentPage: page,
      totalPages,
      search,
      status
    });

  } catch (error){
    console.error(err);
    res.status(500).send("Server Error");
  }
};
//load add user
exports.loadAddUser = (req, res) => {
  res.render('admin/addUser', {
    title: "Add User"
  });
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