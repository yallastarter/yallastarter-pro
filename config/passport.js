const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
    },
        async function (accessToken, refreshToken, profile, done) {
            try {
                // Check if user exists
                let user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // Update user with google info if needed, or just return user
                    return done(null, user);
                } else {
                    // Create new user
                    const newUser = new User({
                        username: profile.displayName,
                        email: profile.emails[0].value,
                        // Generate a random password for Google auth users (they won't use it)
                        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
                        photoUrl: profile.photos[0].value,
                        role: 'user'
                    });
                    await newUser.save();
                    return done(null, newUser);
                }
            } catch (err) {
                return done(err, null);
            }
        }));
} else {
    console.log('⚠️ Google OAuth credentials not found in .env. Google login disabled.');
}

module.exports = passport;
