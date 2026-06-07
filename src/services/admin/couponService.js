const Coupon = require('../../models/couponModel');

exports.getCoupons = async ({
  search,

  status,

  page,
}) => {
  const limit = 10;

  const skip = (page - 1) * limit;

  const query = {};

  if (search) {
    query.code = {
      $regex: search,

      $options: 'i',
    };
  }

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let coupon of coupons) {
    if (coupon.isActive) {
      const expiry = new Date(coupon.expiryDate);
      if (expiry.setHours(0, 0, 0, 0) < today.getTime()) {
        coupon.isActive = false;
        await coupon.save();
      }
    }
  }

  const totalCoupons = await Coupon.countDocuments(query);

  return {
    coupons,

    totalPages: Math.ceil(totalCoupons / limit),
  };
};

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
  if (
    data.discountType === 'FIXED' &&
    Number(data.minimumOrderAmount) <= Number(data.discountValue)
  ) {
    return {
      success: false,
      message: 'Minimum purchase should be greater than discount amount',
    };
  }
  if (data.discountType === 'PERCENTAGE' && Number(data.discountValue) > 100) {
    return {
      success: false,
      message: 'Percentage discount cannot exceed 100',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(data.expiryDate);
  if (expiry.setHours(0, 0, 0, 0) < today.getTime()) {
    return {
      success: false,
      message: 'Expiry date cannot be in the past',
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
exports.updateCoupon = async (id, data) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    return { success: false, message: 'Coupon not found' };
  }
  const mongoose = require('mongoose');
  const existingCoupon = await Coupon.findOne({
    code: data.code.toUpperCase(),
    _id: { $ne: new mongoose.Types.ObjectId(id) },
  });
  if (existingCoupon) {
    return { success: false, message: 'Coupon code already exist' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(data.expiryDate);
  if (expiry.setHours(0, 0, 0, 0) < today.getTime()) {
    return {
      success: false,
      message: 'Expiry date cannot be in the past',
    };
  }
  coupon.code = data.code.toUpperCase();
  coupon.discountType = data.discountType;
  coupon.discountValue = data.discountValue;
  coupon.minimumOrderAmount = data.minimumOrderAmount;
  coupon.expiryDate = data.expiryDate;
  coupon.maximumDiscount = data.maximumDiscount || 0;
  await coupon.save();
  return { success: true, coupon };
};
