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

// ─── Demo / Local Login (Instant Access) ─────────────────────────────────────
router.get('/demo', async (req, res) => {
  try {
    let viewer = await prisma.viewer.findFirst({
      where: { twitchLogin: 'demo_wrestler' },
    });

    if (!viewer) {
      viewer = await prisma.viewer.create({
        data: {
          twitchId: 'demo_12345',
          twitchLogin: 'demo_wrestler',
          displayName: 'El Macho Marble',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          ringName: 'El Macho Marble',
          hometown: 'San Diego, CA',
          bio: 'The masked sensation of MCW!',
          characterData: JSON.stringify({
            marble: 1,
            armsLegs: 1,
            eyes: 1,
            hat: 1,
          }),
        },
      });

      await prisma.careerStats.upsert({
        where: { viewerId: viewer.id },
        update: {},
        create: { viewerId: viewer.id, wins: 5, losses: 2, totalRaces: 7, currentStreak: 3 },
      });
    }

    const token = makeToken(viewer);
    const dest = viewer.ringName ? 'profile' : 'setup';
    res.redirect(`/${dest}?token=${token}`);
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Demo login failed' });
  }
});

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
