/**
 * Middleware: requires the user to be logged in via Twitch OAuth.
 * Returns 401 if not authenticated.
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Middleware: requires the user to be an admin.
 * Returns 403 if authenticated but not admin.
 */
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware: authenticates requests from the watcher script via API key.
 * Reads the key from the Authorization header: "Bearer <key>"
 */
function requireWatcherKey(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const key = authHeader.slice(7);
  if (key !== process.env.WATCHER_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

module.exports = { requireAuth, requireAdmin, requireWatcherKey };
