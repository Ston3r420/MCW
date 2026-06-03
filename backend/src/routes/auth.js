const express = require('express');
const passport = require('passport');
const router = express.Router();

// ─── Initiate Twitch OAuth flow ───────────────────────────────────────────────
router.get('/twitch', passport.authenticate('twitch'));

// ─── Twitch OAuth callback ────────────────────────────────────────────────────
router.get(
  '/twitch/callback',
  passport.authenticate('twitch', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Successful — redirect to frontend with logged=1 flag so it knows to refetch /auth/me
    const isNewProfile = !req.user.ringName;
    const dest = isNewProfile ? 'setup' : 'profile';
    res.redirect(`${process.env.FRONTEND_URL}/${dest}?logged=1`);
  }
);

// ─── Get current session user ─────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.json({ user: null });
  }

  // Return safe subset of user data
  const { id, twitchLogin, displayName, avatarUrl, ringName, hometown, bio, isAdmin } = req.user;
  res.json({
    user: { id, twitchLogin, displayName, avatarUrl, ringName, hometown, bio, isAdmin },
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

module.exports = router;
