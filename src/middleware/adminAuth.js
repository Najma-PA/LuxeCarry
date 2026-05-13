const Admin = require('../models/adminModel');
exports.isAdminAuth = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');

  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  next();
};

exports.redirectIfAdminLoggedIn = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');

  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  next();
};
