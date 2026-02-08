/**
 * Authentication middleware for protecting routes
 */

/**
 * Middleware to ensure user is authenticated
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // User is not authenticated
  res.status(401).json({
    success: false,
    error: 'Authentication required',
    code: 'ERR_AUTH_REQUIRED'
  });
}

/**
 * Middleware to check if user is authenticated (doesn't block)
 * Just adds user info to request if available
 */
function checkAuthenticated(req, res, next) {
  req.user = req.isAuthenticated() ? req.user : null;
  next();
}

module.exports = {
  ensureAuthenticated,
  checkAuthenticated
};
