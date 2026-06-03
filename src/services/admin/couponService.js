const Coupon = require('../../models/couponModel');

/* =========================================
   GET COUPONS
========================================= */

exports.getCoupons = async ({
  search,

  status,

  page,
}) => {
  const limit = 10;

  const skip = (page - 1) * limit;

  const query = {};

  /*
    SEARCH
    */

  if (search) {
    query.code = {
      $regex: search,

      $options: 'i',
    };
  }

  /*
    STATUS
    */

  if (status === 'active') {
    query.isActive = true;
  }

  if (status === 'inactive') {
    query.isActive = false;
  }

  const coupons = await Coupon.find(query)

    .sort({
      createdAt: -1,
    })

    .skip(skip)

    .limit(limit);

  const totalCoupons = await Coupon.countDocuments(query);

  return {
    coupons,

    totalPages: Math.ceil(totalCoupons / limit),
  };
};

/* =========================================
   CREATE COUPON
========================================= */

exports.createCoupon = async (data) => {
  const existingCoupon = await Coupon.findOne({
    code: data.code.toUpperCase(),
  });

  if (existingCoupon) {
    return {
      success: false,

      message: 'Coupon already exists',
    };
  }

  const coupon = await Coupon.create({
    code: data.code.toUpperCase(),

    discountType: data.discountType,

    discountValue: data.discountValue,

    minimumOrderAmount: data.minimumOrderAmount,

    maximumDiscount: data.maximumDiscount || 0,

    expiryDate: data.expiryDate,
  });

  return {
    success: true,

    coupon,
  };
};

/* =========================================
   TOGGLE COUPON
========================================= */

exports.toggleCoupon = async (id) => {
  const coupon = await Coupon.findById(id);

  coupon.isActive = !coupon.isActive;

  await coupon.save();

  return {
    success: true,
  };
};

exports.deleteCoupon = async (id) => {
  await Coupon.findByIdAndDelete(id);

  return {
    success: true,
  };
};
