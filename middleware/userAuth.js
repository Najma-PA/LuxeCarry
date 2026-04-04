
const User = require('../models/userModel');

exports.isUserAuth = async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (!req.session.user) {
    return res.redirect('/');
  }

  const user = await User.findById(req.session.user.id);

  if (!user) {
    req.session.destroy();
    return res.redirect('/');
  }

  if (user.isBlocked) {
    req.session.destroy();
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
