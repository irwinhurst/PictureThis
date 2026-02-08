const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// In-memory user storage (will be replaced with database in Story 2.1)
const users = new Map();

function configurePassport(logger) {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser((id, done) => {
    const user = users.get(id);
    done(null, user);
  });

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
        scope: ['openid', 'profile', 'email']
      },
      (accessToken, refreshToken, profile, done) => {
        logger.info('Google OAuth callback', { profileId: profile.id });

        try {
          // Check if user exists
          let user = Array.from(users.values()).find(
            u => u.google_id === profile.id
          );

          if (!user) {
            // Create new user
            user = {
              id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              google_id: profile.id,
              email: profile.emails?.[0]?.value || null,
              name: profile.displayName || 'Unknown',
              profile_picture_url: profile.photos?.[0]?.value || null,
              created_at: new Date().toISOString(),
              last_login_at: new Date().toISOString()
            };
            users.set(user.id, user);
            logger.info('New user created', { userId: user.id, email: user.email });
          } else {
            // Update last login
            user.last_login_at = new Date().toISOString();
            logger.info('Existing user logged in', { userId: user.id, email: user.email });
          }

          return done(null, user);
        } catch (error) {
          logger.error('Error in Google OAuth callback', { error: error.message });
          return done(error, null);
        }
      }
    )
  );

  logger.info('Passport configured with Google OAuth strategy');
}

// Helper function to get user by ID (for testing)
function getUserById(userId) {
  return users.get(userId);
}

// Helper function to get all users (for testing/debugging)
function getAllUsers() {
  return Array.from(users.values());
}

// Helper function to clear all users (for testing)
function clearUsers() {
  users.clear();
}

module.exports = {
  configurePassport,
  getUserById,
  getAllUsers,
  clearUsers
};
