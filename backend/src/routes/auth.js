const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
const prisma = new PrismaClient();

function makeToken(viewer) {
  return jwt.sign(
    { id: viewer.id },
    process.env.SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

// ─── Initiate Twitch OAuth flow ───────────────────────────────────────────────
router.get('/twitch', passport.authenticate('twitch'));

// ─── Twitch OAuth callback ────────────────────────────────────────────────────
router.get(
  '/twitch/callback',
  passport.authenticate('twitch', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  (req, res) => {
    const token = makeToken(req.user);
    const dest = req.user.ringName ? 'profile' : 'setup';
    // Pass token to frontend via URL — frontend stores it in localStorage
    res.redirect(`${process.env.FRONTEND_URL}/${dest}?token=${token}`);
  }
);

// ─── Get current user (JWT) ───────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const { id, twitchLogin, displayName, avatarUrl, ringName, hometown, bio, isAdmin } = req.user;
  res.json({
    user: { id, twitchLogin, displayName, avatarUrl, ringName, hometown, bio, isAdmin },
  });
});

// ─── Logout (client-side only with JWT) ──────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
