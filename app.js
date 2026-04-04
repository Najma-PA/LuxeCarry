const express = require('express');
const path = require('path');
require('dotenv').config();

const passport = require("./config/passport");

const adminSession = require('./config/adminSession');
const userSession = require('./config/userSession');
const connectDB = require('./config/connectDb');

const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const noCache = require('./middleware/noCache');
const errorHandler = require('./middleware/errorHandler');

const app = express();

/* VIEW ENGINE */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/* STATIC FILES */
app.use(express.static(path.join(__dirname, 'public')));

/* BODY PARSER */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* CACHE */

// app.use(noCache);

/* USER SESSION (GLOBAL for passport) */
app.use(userSession);

/* PASSPORT */
app.use(passport.initialize());
app.use(passport.session());
/* GLOBAL LOCALS */
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.admin = req.session.admin || null;
  next();
});

/* ADMIN SESSION (separate) */
app.use('/admin', adminSession, adminRoutes);

/* USER ROUTES */
app.use('/user', noCache, userRoutes);



/* ROOT */
const { redirectIfUserLoggedIn } = require('./middleware/userAuth');
app.get('/', redirectIfUserLoggedIn, (req, res) => {
  res.render('user/home', {
    user: req.user || null
  });
});

/* ERROR HANDLER */
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

/* DB + SERVER */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});