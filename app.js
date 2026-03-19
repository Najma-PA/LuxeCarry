const express = require('express');
const path = require('path');
require('dotenv').config();

const passport=require("./config/passport")

const adminSession = require('./config/adminSession');
const userSession = require('./config/userSession');
const connectDB = require('./config/connectDb');

const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const noCache = require('./middleware/noCache');
const errorHandler = require('./middleware/errorHandler');

const app = express();

/*  VIEW ENGINE*/
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/*  FILES*/
app.use(express.static(path.join(__dirname, 'public')));

/*BODY PARSER*/
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* CACHE*/
app.use(noCache);

/* SESSION (IMPORTANT) */
app.use('/user', userSession, userRoutes);
app.use('/admin', adminSession, adminRoutes);

app.use(passport.initialize());
app.use(passport.session());

//global user for ejs
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

/*ROOT ROUTE*/
app.get('/', (req, res) => {
  res.render('user/home', {
    user: req.session?.user || null
  });
});

/* ROUTES + SESSION
app.use('/user',userRoutes);

/*ADMIN ROUTES + SESSION
app.use(
  '/admin',adminRoutes);
  */
const PORT = process.env.PORT || 3000;

//error handler
app.use(errorHandler);

/*DB + SERVER*/

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
