

  const passport = require("passport");

  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  const TwitterStrategy = require("passport-twitter").Strategy;

  const User = require("../models/User"); // Adjust the path to your User model

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "https://www.api.thler.com/api/google/callback", //http://localhost:3001
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Check if user exists using email
          let user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            // If user doesn't exist, create a new one
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName.replace(/\s+/g, ''),
              email: profile.emails[0].value,
              image: profile.photos[0].value,
            });
          }

          // Existing or newly created user is returned
          return done(null, user);
        } catch (err) {
          console.error("Error during GoogleStrategy authentication:", err);
          return done(err, null);
        }
      }
    )
  );
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: "/api/twitter/callback",
      },
      async (token, tokenSecret, profile, done) => {
        try {
          let user = await User.findOne({ twitterId: profile.id });

          if (!user) {
            // If user doesn't exist, create a new one
            user = await User.create({
              twitterId: profile.id,
              name: profile.displayName.replace(/\s+/g, ''),
              // Twitter does not provide email by default
              // Add any other relevant fields
            });
          }

          return done(null, user);
        } catch (err) {
          console.error("Error during TwitterStrategy authentication:", err);
          return done(err, null);
        }
      }
    )
  );


  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      console.error("Error during user deserialization:", err);
      done(err, null);
    }
  });

  module.exports = passport;
