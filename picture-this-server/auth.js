const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

// In-memory user storage (temporary until Story 2.1 database is implemented)
const users = new Map();

// Find or create user from Google profile
function findOrCreateUser(profile) {
  const googleId = profile.id;
  
  // Check if user already exists
  if (users.has(googleId)) {
    const user = users.get(googleId);
    // Update last login
    user.last_login_at = new Date().toISOString();
    return user;
  }
  
  // Create new user
  const newUser = {
    id: generateUUID(),
    google_id: googleId,
    email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
    name: profile.displayName,
    profile_picture_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString()
  };
  
  users.set(googleId, newUser);
  return newUser;
}

// Find user by ID
function findUserById(userId) {
  for (const user of users.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return null;
}

// Generate UUID (simple implementation)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Configure Google OAuth Strategy
function configureGoogleStrategy() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. OAuth will not work.');
    return;
  }
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    try {
      const user = findOrCreateUser(profile);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
  
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser((id, done) => {
    const user = findUserById(id);
    done(null, user);
  });
}

// Generate JWT token for authenticated user
function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRY || '24h';
  
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    secret,
    { expiresIn }
  );
}

// Verify JWT token
function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

// Authentication middleware for protected routes
function requireAuth(req, res, next) {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      // Find user and attach to request
      const user = findUserById(decoded.id);
      if (user) {
        req.user = user;
        return next();
      }
    }
  }
  
  // Check for session-based authentication
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // No valid authentication found
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required'
  });
}

module.exports = {
  configureGoogleStrategy,
  generateToken,
  verifyToken,
  requireAuth,
  findUserById,
  users
};
