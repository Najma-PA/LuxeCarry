const couponService = require('../../services/admin/couponService');

exports.getCouponsPage = async (req, res, next) => {
  try {
    const {
      search = '',

      status = '',

      page = 1,
    } = req.query;

    const result = await couponService.getCoupons({
      search,

      status,

      page,
    });

    //ajax
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

exports.createCoupon = async (req, res, next) => {
  try {
    await couponService.createCoupon(req.body);

    return res.redirect('/admin/coupons');
  } catch (error) {
    next(error);
  }
};

exports.toggleCoupon = async (req, res, next) => {
  try {
    const result = await couponService.toggleCoupon(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const result = await couponService.deleteCoupon(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
exports.editCoupon = async (req, res, next) => {
  try {
    const result = await couponService.updateCoupon(req.params.id, req.body);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};
