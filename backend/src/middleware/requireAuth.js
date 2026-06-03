const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware: verifies JWT from Authorization header or query param.
 * Attaches req.user if valid.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    const viewer = await prisma.viewer.findUnique({ where: { id: payload.id } });
    if (!viewer) return res.status(401).json({ error: 'User not found' });
    req.user = viewer;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware: requires admin role.
 */
async function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.token;

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    const viewer = await prisma.viewer.findUnique({ where: { id: payload.id } });
    if (!viewer) return res.status(401).json({ error: 'User not found' });
    if (!viewer.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    req.user = viewer;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware: authenticates watcher script via API key.
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
