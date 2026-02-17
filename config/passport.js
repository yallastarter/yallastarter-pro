const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Full callback URL required for Google OAuth (local + Render production)
    const baseUrl = (process.env.BASE_URL || process.env.CLIENT_URL || '').replace(/\/$/, '') || 'http://localhost:3000';
    const callbackURL = `${baseUrl}/api/auth/google/callback`;
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL
    },
        async function (accessToken, refreshToken, profile, done) {
            try {
                const email = (profile.emails && profile.emails[0] && profile.emails[0].value) ? profile.emails[0].value.toLowerCase().trim() : null;
                if (!email) return done(new Error('No email from Google profile'), null);

                let user = await User.findOne({ email });

                if (user) {
                    // Optionally update photo if missing
                    if (!user.photoUrl && profile.photos && profile.photos[0]) {
                        user.photoUrl = profile.photos[0].value;
                        await user.save();
                    }
                    return done(null, user);
                }

                // Sanitize username: must be unique, 3+ chars, no spaces (schema requirement)
                let username = (profile.displayName || email.split('@')[0]).replace(/\s+/g, '').trim().slice(0, 30);
                if (username.length < 3) username = email.split('@')[0].slice(0, 30);
                while (username.length < 3) username += '0';
                const existingByName = await User.findOne({ username });
                if (existingByName) username = username + '_' + Date.now().toString(36);

                const newUser = new User({
                    username,
                    email,
                    password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
                    photoUrl: (profile.photos && profile.photos[0]) ? profile.photos[0].value : null,
                    role: 'user'
                });
                await newUser.save();
                return done(null, newUser);
            } catch (err) {
                return done(err, null);
            }
        }));
} else {
    console.log('⚠️ Google OAuth credentials not found in .env. Google login disabled.');
}

module.exports = passport;
