/**
 * ---
 * title: Authentication Routes
 * purpose: Handles authentication-related routes including Google OAuth
 *          login flow, logout, profile retrieval, and login failure handling.
 *          Works with Passport.js for OAuth integration.
 * exports: function(app, deps) - Route registration function
 * dependencies: passport, auth, logger
 * ---
 */

module.exports = function(app, { passport, auth, logger }) {

  // Initiate Google OAuth login
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['openid', 'profile', 'email'] })
  );

  // Google OAuth callback
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-failed' }),
    (req, res) => {
      // Generate JWT token
      const token = auth.generateToken(req.user);
      
      // Redirect to frontend with token
      // In a real app, this would redirect to the host dashboard
      res.redirect(`/login.html?token=${token}`);
    }
  );

  // Logout endpoint
  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        logger.error('Error during logout', { error: err.message });
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session', { error: err.message });
        }
        res.json({ message: 'Logged out successfully' });
      });
    });
  });

  // Get current user profile (protected route)
  app.get('/api/profile', auth.requireAuth, (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        profile_picture_url: req.user.profile_picture_url
      }
    });
  });

  // Login failed page
  app.get('/login-failed', (req, res) => {
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Failed to authenticate with Google. Please try again.'
    });
  });
};
