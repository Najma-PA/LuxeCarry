const User = require('../../models/userModel');

const generateReferralCode = async (name) => {
  let referralCode;
  let existReferral;

  do {
    referralCode = name.substring(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

    existReferral = await User.findOne({
      referralCode,
    });
  } while (existReferral);

  return referralCode;
};

module.exports = generateReferralCode;
