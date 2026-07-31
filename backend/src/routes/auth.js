const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

function makeToken(viewer) {
  return jwt.sign(
    { id: viewer.id },
    process.env.SESSION_SECRET || 'dev-secret-change-me',
    { expiresIn: '7d' }
  );
}

function getFrontendUrl(req) {
  const envUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const host = req.get('host') || '';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  
  const isRequestLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const isEnvLocal = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
  
  if (!envUrl || (isEnvLocal && !isRequestLocal)) {
    return `${proto}://${host}`;
  }
  return envUrl;
}


// ─── Initiate Twitch OAuth flow ───────────────────────────────────────────────
router.get('/twitch', passport.authenticate('twitch'));

// ─── Twitch OAuth callback ────────────────────────────────────────────────────
router.get('/twitch/callback', (req, res, next) => {
  const frontendUrl = getFrontendUrl(req);
  passport.authenticate('twitch', { session: false }, (err, user, info) => {
    if (err || !user) {
      console.error('[Auth] Twitch OAuth callback error:', err || info);
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
    const token = makeToken(user);
    const dest = user.ringName ? 'profile' : 'setup';
    return res.redirect(`${frontendUrl}/${dest}?token=${token}`);
  })(req, res, next);
});

// ─── Get current user (JWT) ───────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const { id, twitchLogin, displayName, avatarUrl, ringName, hometown, bio, isAdmin, characterData } = req.user;
  let parsedCharacterData = characterData;
  if (typeof characterData === 'string') {
    try { parsedCharacterData = JSON.parse(characterData); } catch {}
  }
  res.json({
    user: { id, twitchLogin, displayName, avatarUrl, ringName, hometown, bio, isAdmin, characterData: parsedCharacterData },
  });
});

// ─── Logout (client-side only with JWT) ──────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
