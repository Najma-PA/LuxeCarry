const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const authService = require("../services/authService");

require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/user/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {

        const user = await authService.findOrCreateGoogleUser(profile);

        return done(null, user);

      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await authService.getUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;