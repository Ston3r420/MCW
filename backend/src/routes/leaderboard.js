const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/leaderboard
 * Returns the top marbles by wins (with streak and title info).
 * Query params: limit (default 25), page (default 1)
 */
router.get('/', async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit) || 25);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const skip = (page - 1) * limit;

  try {
    // Get stats ordered by wins
    const stats = await prisma.careerStats.findMany({
      orderBy: [{ wins: 'desc' }, { totalRaces: 'desc' }],
      skip,
      take: limit,
      include: {
        // We need the viewer record — using a raw join approach via include
      },
    });

    // Fetch viewer data for each stat row
    const viewerIds = stats.map((s) => s.viewerId);
    const viewers = await prisma.viewer.findMany({
      where: { id: { in: viewerIds }, isBlocked: false },
      select: {
        id: true,
        displayName: true,
        ringName: true,
        avatarUrl: true,
        hometown: true,
      },
    });

    const viewerMap = new Map(viewers.map((v) => [v.id, v]));

    // Fetch current title holders to annotate
    const titleReigns = await prisma.titleReign.findMany({
      where: { viewerId: { in: viewerIds }, lostAt: null },
      include: { belt: { select: { shortName: true } } },
    });

    const titleMap = new Map();
    for (const reign of titleReigns) {
      if (!titleMap.has(reign.viewerId)) titleMap.set(reign.viewerId, []);
      titleMap.get(reign.viewerId).push(reign.belt.shortName);
    }

    // Build leaderboard rows
    const leaderboard = stats
      .filter((s) => viewerMap.has(s.viewerId))
      .map((s, index) => {
        const viewer = viewerMap.get(s.viewerId);
        const streak = s.currentStreak;
        return {
          rank: skip + index + 1,
          viewer,
          wins: s.wins,
          losses: s.losses,
          totalRaces: s.totalRaces,
          winRate: s.totalRaces > 0 ? Math.round((s.wins / s.totalRaces) * 100) : 0,
          currentStreak: streak,
          streakLabel: getStreakLabel(streak),
          titles: titleMap.get(s.viewerId) || [],
        };
      });

    const total = await prisma.careerStats.count();
    res.json({ leaderboard, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/champions
 * Returns current title holders.
 */
router.get('/champions', async (req, res) => {
  try {
    const reigns = await prisma.titleReign.findMany({
      where: { lostAt: null },
      include: {
        belt: true,
        viewer: {
          select: {
            id: true,
            displayName: true,
            ringName: true,
            avatarUrl: true,
            hometown: true,
          },
        },
      },
      orderBy: { wonAt: 'asc' },
    });

    res.json({ champions: reigns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch champions' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStreakLabel(streak) {
  if (streak >= 10) return '🔥 On a MONSTER run';
  if (streak >= 5) return '🔥 On a push';
  if (streak >= 3) return '📈 Hot streak';
  if (streak === 0) return '—';
  if (streak <= -10) return '💀 Absolute jobber territory';
  if (streak <= -5) return '📉 Enhancement talent';
  if (streak <= -3) return '😬 Cold streak';
  return '—';
}

module.exports = router;
