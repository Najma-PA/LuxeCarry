const User = require("../models/userModel");

exports.findOrCreateGoogleUser = async (profile) => {

  let user = await User.findOne({ googleId: profile.id });

  if (user) {
    return user;
  }

  user = await User.findOne({ email: profile.emails[0].value });

  if (user) {
    user.googleId = profile.id;
    await user.save();
    return user;
  }

  user = new User({
    name: profile.displayName,
    email: profile.emails[0].value,
    googleId: profile.id,
    isVerified: true
  });

  await user.save();

  return user;
};

exports.getUserById = async (id) => {
  return await User.findById(id);
};