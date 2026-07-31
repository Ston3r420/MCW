const express = require('express');
const { prisma } = require('../lib/db');
const { requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();

// All admin routes require admin auth
router.use(requireAdmin);

// ─── Blocklist ────────────────────────────────────────────────────────────────

router.get('/blocklist', async (req, res) => {
  const list = await prisma.blockedAccount.findMany({ orderBy: { addedAt: 'desc' } });
  res.json({ blocklist: list });
});

router.post('/blocklist', async (req, res) => {
  const { twitchLogin, reason } = req.body;
  if (!twitchLogin) return res.status(400).json({ error: 'twitchLogin is required' });

  try {
    const entry = await prisma.blockedAccount.upsert({
      where: { twitchLogin: twitchLogin.toLowerCase() },
      update: { reason },
      create: { twitchLogin: twitchLogin.toLowerCase(), reason },
    });

    // Also mark the viewer as blocked if they exist
    await prisma.viewer.updateMany({
      where: { twitchLogin: twitchLogin.toLowerCase() },
      data: { isBlocked: true },
    });

    res.status(201).json({ entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to blocklist' });
  }
});

router.delete('/blocklist/:twitchLogin', async (req, res) => {
  const login = req.params.twitchLogin.toLowerCase();

  try {
    await prisma.blockedAccount.delete({ where: { twitchLogin: login } });
    await prisma.viewer.updateMany({
      where: { twitchLogin: login },
      data: { isBlocked: false },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: 'Account not found in blocklist' });
  }
});

// ─── Belt / Title Management ──────────────────────────────────────────────────

router.get('/belts', async (req, res) => {
  const belts = await prisma.belt.findMany({ include: { _count: { select: { reigns: true } } } });
  res.json({ belts });
});

/**
 * POST /api/admin/belts/:beltId/award
 * Manually assign a belt to a viewer (ends any current reign first).
 */
router.post('/belts/:beltId/award', async (req, res) => {
  const { viewerId } = req.body;
  if (!viewerId) return res.status(400).json({ error: 'viewerId is required' });

  try {
    const belt = await prisma.belt.findUnique({ where: { id: req.params.beltId } });
    if (!belt) return res.status(404).json({ error: 'Belt not found' });

    const viewer = await prisma.viewer.findUnique({ where: { id: viewerId } });
    if (!viewer) return res.status(404).json({ error: 'Viewer not found' });

    // End any current reign for this belt
    await prisma.titleReign.updateMany({
      where: { beltId: belt.id, lostAt: null },
      data: { lostAt: new Date() },
    });

    // Create new reign
    const reign = await prisma.titleReign.create({
      data: { beltId: belt.id, viewerId },
      include: { belt: true, viewer: { select: { displayName: true, ringName: true } } },
    });

    res.status(201).json({ reign });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to award belt' });
  }
});

// ─── Result Override ──────────────────────────────────────────────────────────

/**
 * DELETE /api/admin/races/:raceId
 * Voids a race entirely (removes all results, triggers stat recalculation).
 */
router.delete('/races/:raceId', async (req, res) => {
  try {
    // Delete results first (FK constraint)
    await prisma.raceResult.deleteMany({ where: { raceId: req.params.raceId } });
    await prisma.race.delete({ where: { id: req.params.raceId } });

    res.json({ success: true, message: 'Race voided. Stats may need recalculation.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to void race' });
  }
});

// ─── Grant / Revoke Admin ─────────────────────────────────────────────────────

router.post('/viewers/:viewerId/make-admin', async (req, res) => {
  try {
    const viewer = await prisma.viewer.update({
      where: { id: req.params.viewerId },
      data: { isAdmin: true },
      select: { id: true, twitchLogin: true, displayName: true, isAdmin: true },
    });
    res.json({ viewer });
  } catch {
    res.status(404).json({ error: 'Viewer not found' });
  }
});

module.exports = router;
