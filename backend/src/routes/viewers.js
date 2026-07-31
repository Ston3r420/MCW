const express = require('express');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/requireAuth');
const { checkCharacterWithGemini } = require('../services/geminiCharacterCheck');
const { generateWrestlerWithAI } = require('../services/geminiGimmickGenerator');
const { aiAlignLayers } = require('../services/geminiAligner');

const router = express.Router();

// ─── Generate AI Wrestler Gimmick & Character ───────────────────────────────
router.post('/ai-generate-gimmick', requireAuth, async (req, res) => {
  const { style } = req.body;
  try {
    const generated = await generateWrestlerWithAI(style);
    res.json(generated);
  } catch (err) {
    console.error('[AIGimmick] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate character with AI' });
  }
});

// ─── AI Auto-Align Layer Assets ──────────────────────────────────────────────
router.post('/ai-align-layers', requireAuth, async (req, res) => {
  const { character, activeLayerOnly, canvasSnapshot } = req.body;
  try {
    const result = await aiAlignLayers({ character, activeLayerOnly, canvasSnapshot });
    res.json(result);
  } catch (err) {
    console.error('[AIAligner] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to align layers with AI' });
  }
});

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
        ...(characterData !== undefined && {
          characterData: typeof characterData === 'object' ? JSON.stringify(characterData) : characterData,
        }),
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

    // Run Gemini character check if characterData was submitted
    let characterCheck = null;
    if (characterData) {
      characterCheck = await checkCharacterWithGemini(characterData);
    }

    if (updated.characterData && typeof updated.characterData === 'string') {
      try { updated.characterData = JSON.parse(updated.characterData); } catch {}
    }

    res.json({ viewer: updated, characterCheck });
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
          { ringName: identifier },
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

    if (viewer.characterData && typeof viewer.characterData === 'string') {
      try { viewer.characterData = JSON.parse(viewer.characterData); } catch {}
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
