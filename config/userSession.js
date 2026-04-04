const session = require('express-session');

module.exports = session({
  name: 'user_session',
  secret: process.env.USER_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60
  }
});