const adminService = require('../../services/admin/adminService');
const dashboardService = require('../../services/admin/dashboardService');
const reportService = require('../../services/admin/reportService');
const bcrypt = require('bcryptjs');

/*AUTH */

exports.showAdminLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    error: null,
    formData: {},
  });
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Please enter admin credentials',
        formData: req.body,
      });
    }

    const admin = await adminService.findAdminByEmail(email);

    if (!admin) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials',
        formData: req.body,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials',
        formData: req.body,
      });
    }

    req.session.admin = {
      id: admin._id,
      email: admin.email,
    };

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.render('admin/login', {
      title: 'Admin Login',
      error: 'Login failed',
      formData: req.body,
    });
  }
};

exports.adminLogout = (req, res) => {
  req.session.admin = null;
  res.clearCookie('admin_session');
  res.redirect('/admin/login');
};

/*DASHBOARD*/

exports.adminDashboard = async (req, res, next) => {
  try {
    const filter = req.query.filter || 'This Year';
    const data = await dashboardService.getdashboardData(filter);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      admin: req.session.admin,
      stats: data.stats,
      topProducts: data.topProducts,
      topCategories: data.topCategories,
      orderStatusData: data.orderStatusData,

      revenueLabels: data.revenueLabels,
      revenueValues: data.revenueValues,
      // monthlyRevenue: data.monthlyRevenue,
      filter: filter,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

/*USER MANAGEMENT*/

exports.loadUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || '';
    const status = req.query.status || 'All Statuses';

    const { users, totalPages } = await adminService.getUsers({
      page,
      limit,
      search,
      status,
    });

    // AJAX Hook
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      const tableHtml = await new Promise((resolve, reject) => {
        res.render('partials/admin/user-table', { users }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      });

      let paginationHtml = '';
      for (let i = 1; i <= totalPages; i++) {
        const activeClass = page === i ? 'active' : '';
        paginationHtml += `<a href="?page=${i}&search=${search}&status=${status}" class="page-btn pagination-link ${activeClass}" data-page="${i}">${i}</a>\n`;
      }

      return res.json({
        success: true,
        tableHtml,
        paginationHtml,
        currentPage: page,
        totalPages,
      });
    }

    res.render('admin/users', {
      title: 'Users',
      users,
      currentPage: page,
      totalPages,
      search,
      status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};
//load add user
exports.loadAddUser = (req, res) => {
  res.render('admin/addUser', {
    title: 'Add User',
  });
};

//block/unblock user
exports.toggleUser = async (req, res) => {
  try {
    const user = await adminService.toggleUserBlock(req.params.id);

    res.json({
      success: true,
      isBlocked: user.isBlocked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

exports.getSalesReportPage = async (req, res) => {
  try {
    const reportData = await reportService.getSalesReport(req.query);

    // AJAX Hook
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      const tableHtml = await new Promise((resolve, reject) => {
        res.render('partials/admin/sales-table', { orders: reportData.orders }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      });

      return res.json({
        success: true,
        tableHtml,
        summary: reportData.summary,
        currentPage: reportData.currentPage,
        totalPages: reportData.totalPages,
      });
    }

    res.render('admin/salesReport', {
      title: 'Sales Report',
      active: 'salesreport',
      req: req,
      orders: reportData.orders,

      summary: reportData.summary,

      search: req.query.search || '',

      reportFilter: req.query.reportFilter || '',

      customStartDate: req.query.customStartDate || '',

      customEndDate: req.query.customEndDate || '',

      currentPage: reportData.currentPage,

      totalPages: reportData.totalPages,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send('Server Error');
  }
};
