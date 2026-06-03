const couponService = require('../../services/admin/couponService');

/* =========================================
   GET COUPON PAGE
========================================= */

exports.getCouponsPage = async (req, res, next) => {
  try {
    const {
      search = '',

      status = 'active',

      page = 1,
    } = req.query;

    const result = await couponService.getCoupons({
      search,

      status,

      page,
    });

    /*
      AJAX
      */

    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,

        tableHtml: await req.app.render('partials/admin/coupon-table', result, (err, html) => html),
      });
    }

    res.render('admin/coupons', {
      ...result,

      search,

      status,

      currentPage: Number(page),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   CREATE COUPON
========================================= */

exports.createCoupon = async (req, res, next) => {
  try {
    const result = await couponService.createCoupon(req.body);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/* =========================================
   TOGGLE COUPON
========================================= */

exports.toggleCoupon = async (req, res, next) => {
  try {
    const result = await couponService.toggleCoupon(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/* =========================================
   DELETE COUPON
========================================= */

exports.deleteCoupon = async (req, res, next) => {
  try {
    const result = await couponService.deleteCoupon(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
