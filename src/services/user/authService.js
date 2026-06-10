const User = require('../../models/userModel');
const generateReferralCode = require('../../utils/userHelpers/generateReferralCode');
exports.findOrCreateGoogleUser = async (profile) => {
  let user = await User.findOne({ googleId: profile.id });

  if (user) {
    return user;
  }

  user = await User.findOne({ email: profile.emails[0].value });

  if (user) {
    user.googleId = profile.id;
    if (!user.referralCode) {
      user.referralCode = await generateReferralCode(user.name);
    }
    await user.save();

    return user;
  }
  user = new User({
    name: profile.displayName,
    email: profile.emails[0].value,
    googleId: profile.id,
    isVerified: true,
    referralCode: await generateReferralCode(profile.displayName),
  });
  await user.save();

  return user;
};

exports.getUserById = async (id) => {
  return await User.findById(id);
};
