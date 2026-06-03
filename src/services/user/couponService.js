const Coupon = require('../../models/couponModel');

exports.getAllCoupons = async () => {
  return await Coupon.find({
    isActive: true,

    expiryDate: {
      $gt: new Date(),
    },
  }).sort({
    createdAt: -1,
  });
};

exports.getEligibleCoupons = async (subtotal) => {
  return await Coupon.find({
    isActive: true,

    expiryDate: {
      $gt: new Date(),
    },

    minimumOrderAmount: {
      $lte: subtotal,
    },
  }).sort({
    minimumOrderAmount: -1,
  });
};

exports.calculateDiscount = (coupon, subtotal) => {
  let discount = 0;

  if (coupon.discountType === 'PERCENTAGE') {
    discount = (subtotal * coupon.discountValue) / 100;

    /*
      MAXIMUM CAP
      */

    if (coupon.maximumDiscount > 0) {
      discount = Math.min(discount, coupon.maximumDiscount);
    }
  } else {
    discount = coupon.discountValue;
  }

  return Math.round(discount);
};

exports.validateCoupon = async (couponCode, subtotal) => {
  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),

    isActive: true,
  });

  /*
    INVALID
    */

  if (!coupon) {
    return {
      success: false,

      message: 'Invalid coupon',
    };
  }

  if (coupon.expiryDate < new Date()) {
    return {
      success: false,

      message: 'Coupon expired',
    };
  }

  if (subtotal < coupon.minimumOrderAmount) {
    return {
      success: false,

      message: `Minimum order amount is ₹${coupon.minimumOrderAmount}`,
    };
  }

  /*
    USAGE LIMIT
    */

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return {
      success: false,

      message: 'Coupon usage limit reached',
    };
  }

  const discount = exports.calculateDiscount(coupon, subtotal);

  return {
    success: true,

    coupon,

    discount,

    finalTotal: subtotal - discount,
  };
};

exports.distributeDiscount = (items, subtotal, couponDiscount) => {
  return items.map((item) => {
    const totalPrice = item.finalPrice * item.quantity;

    let itemCouponDiscount = 0;

    if (couponDiscount > 0 && subtotal > 0) {
      itemCouponDiscount = (totalPrice / subtotal) * couponDiscount;
    }

    itemCouponDiscount = Number(itemCouponDiscount.toFixed(2));

    const finalPayable = Number((totalPrice - itemCouponDiscount).toFixed(2));

    return {
      ...item,

      totalPrice,

      couponDiscount: itemCouponDiscount,

      finalPayable,
    };
  });
};

exports.incrementUsage = async (couponId) => {
  await Coupon.findByIdAndUpdate(
    couponId,

    {
      $inc: {
        usedCount: 1,
      },
    }
  );
};
