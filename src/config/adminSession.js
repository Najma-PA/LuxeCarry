const session = require('express-session');

module.exports = session({
  name: 'admin_session',
  secret: process.env.ADMIN_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60
  }
});
