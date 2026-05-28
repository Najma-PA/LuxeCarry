const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

  let statusCode = err.statusCode || 500;

  let message = statusCode === 500 ? 'Smething went wrong' : err.message;

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;

    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Duplicate Key Error
  else if (err.code === 11000) {
    statusCode = 400;

    const field = Object.keys(err.keyPattern)[0];

    message = `${field} already exists`;
  }

  // Invalid Mongo ID
  else if (err.name === 'CastError') {
    statusCode = 400;

    message = 'Invalid ID format';
  }

  // JWT Error
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;

    message = 'Invalid token';
  }

  // AJAX / API REQUESTS
  if (isAjax) {
    return res.status(statusCode).json({
      success: false,
      message,

      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    });
  }

  // NORMAL PAGE REQUESTS
  if (req.flash) {
    req.flash('error', message);
  }

  return res.redirect(req.get('Referrer') || '/');
};

module.exports = errorHandler;
