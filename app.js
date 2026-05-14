const express = require('express');
const path = require('path');
require('dotenv').config();

const passport = require('./src/config/passport');

const adminSession = require('./src/config/adminSession');
const userSession = require('./src/config/userSession');
const connectDB = require('./src/config/connectDb');

const userRoutes = require('./src/routes/user');
const adminRoutes = require('./src/routes/admin');
const noCache = require('./src/middleware/noCache');
const errorHandler = require('./src/middleware/errorHandler');

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

app.use('/admin', adminSession);
/* USER SESSION (GLOBAL for passport) */
app.use(userSession);

/* PASSPORT */
app.use(passport.initialize());
app.use(passport.session());
const cartService = require('./src/services/user/cartService');

/* GLOBAL LOCALS */
app.use(async (req, res, next) => {
  try {
    const user = req.user || req.session?.user || null;
    res.locals.user = user;
    res.locals.admin = req.session?.admin || null;

    // Support both Passport (_id) and Custom Session (id)
    const userId = user ? user._id || user.id : null;
    res.locals.cartCount = userId ? await cartService.getCartCount(userId) : 0;
  } catch (err) {
    console.error('Error in global locals middleware:', err);
    res.locals.cartCount = 0;
  }
  next();
});

app.use('/admin', adminRoutes);
app.use('/user', noCache, userRoutes);

/* ROOT */
const { redirectIfUserLoggedIn } = require('./src/middleware/userAuth');
/*app.get('/', redirectIfUserLoggedIn, (req, res) => {
  res.render('user/home', {
    user: req.user || null
  });
  */
app.get('/', redirectIfUserLoggedIn, (req, res) => {
  res.redirect('/user/home');
});

/* ERROR HANDLER */
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

/* DB + SERVER */
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
  });
