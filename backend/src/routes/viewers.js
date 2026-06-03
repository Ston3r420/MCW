const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Update current viewer's wrestler profile ─────────────────────────────────
router.patch('/me', requireAuth, async (req, res) => {
  const { ringName, hometown, bio, characterData } = req.body;

  // Basic validation
  if (ringName !== undefined && (typeof ringName !== 'string' || ringName.trim().length === 0)) {
    return res.status(400).json({ error: 'Ring name must be a non-empty string' });
  }
  if (ringName && ringName.length > 50) {
    return res.status(400).json({ error: 'Ring name must be 50 characters or fewer' });
  }
  if (hometown && hometown.length > 100) {
    return res.status(400).json({ error: 'Hometown must be 100 characters or fewer' });
  }
  if (bio && bio.length > 500) {
    return res.status(400).json({ error: 'Bio must be 500 characters or fewer' });
  }

  try {
    const updated = await prisma.viewer.update({
      where: { id: req.user.id },
      data: {
        ...(ringName !== undefined && { ringName: ringName.trim() }),
        ...(hometown !== undefined && { hometown: hometown.trim() }),
        ...(bio !== undefined && { bio: bio.trim() }),
        ...(characterData !== undefined && { characterData }),
      },
      select: {
        id: true,
        twitchLogin: true,
        displayName: true,
        avatarUrl: true,
        ringName: true,
        hometown: true,
        bio: true,
        characterData: true,
      },
    });

    res.json({ viewer: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── Get a viewer's public profile by ring name or twitchLogin ───────────────
router.get('/:identifier', async (req, res) => {
  const { identifier } = req.params;

  try {
    const viewer = await prisma.viewer.findFirst({
      where: {
        OR: [
          { twitchLogin: identifier.toLowerCase() },
          { ringName: { equals: identifier, mode: 'insensitive' } },
        ],
        isBlocked: false,
      },
      select: {
        id: true,
        displayName: true,
        ringName: true,
        hometown: true,
        bio: true,
        avatarUrl: true,
        characterData: true,
        createdAt: true,
      },
    });

    if (!viewer) {
      return res.status(404).json({ error: 'Viewer not found' });
    }

    // Fetch career stats
    const stats = await prisma.careerStats.findUnique({
      where: { viewerId: viewer.id },
    });

    // Fetch current title reigns
    const titles = await prisma.titleReign.findMany({
      where: { viewerId: viewer.id, lostAt: null },
      include: { belt: { select: { name: true, shortName: true } } },
    });

    // Fetch recent race results (last 20)
    const recentResults = await prisma.raceResult.findMany({
      where: { viewerId: viewer.id },
      orderBy: { race: { finishedAt: 'desc' } },
      take: 20,
      include: {
        race: {
          select: {
            raceNumber: true,
            finishedAt: true,
            session: { select: { streamDate: true, label: true } },
          },
        },
      },
    });

    res.json({ viewer, stats, titles, recentResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch viewer profile' });
  }
});

module.exports = router;
