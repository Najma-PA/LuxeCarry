
const User = require('../models/userModel');

exports.isUserAuth = async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const isAjax = req.headers.accept && req.headers.accept.includes('application/json');

if (!req.session.user) {
  if (isAjax) {
    return res.status(401).json({ success: false, message: 'Please log in to continue.' });
  }
  return res.redirect('/user/login');
}

  const user = await User.findById(req.session.user.id);

  if (!user) {
    req.session.destroy();
    if (req.originalUrl.includes('/cart/') || req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.redirect('/user/login');
  }

  if (user.isBlocked) {
    req.session.destroy();
    if (req.originalUrl.includes('/cart/') || req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(401).json({ success: false, message: 'Account blocked. Please contact support.' });
    }
    return res.render('user/login', { error: 'Account blocked' });
  }

  req.user = user;   

  next();
};

exports.redirectIfUserLoggedIn = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.session.user) {
    return res.redirect('/user/home');
  }
  next();
};
