const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireWatcherKey, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/sessions
 * Called by the watcher script to create a new stream session.
 * { streamDate: ISO string, label: string (optional), rawDataHash: string (optional) }
 */
router.post('/', requireWatcherKey, async (req, res) => {
  const { streamDate, label, rawDataHash } = req.body;

  if (!streamDate) {
    return res.status(400).json({ error: 'streamDate is required' });
  }

  // Deduplicate by hash if provided
  if (rawDataHash) {
    const existing = await prisma.session.findFirst({ where: { rawDataHash } });
    if (existing) {
      return res.status(200).json({ session: existing, duplicate: true });
    }
  }

  try {
    const session = await prisma.session.create({
      data: {
        streamDate: new Date(streamDate),
        label: label || null,
        rawDataHash: rawDataHash || null,
      },
    });

    res.status(201).json({ session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/sessions
 * Returns recent sessions (paginated).
 */
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  try {
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        orderBy: { streamDate: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { races: true } },
          eventCard: { select: { id: true, generatedAt: true } },
        },
      }),
      prisma.session.count(),
    ]);

    res.json({ sessions, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Returns a single session with its races.
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.sessionId },
      include: {
        races: {
          orderBy: { raceNumber: 'asc' },
          include: { _count: { select: { results: true } } },
        },
        eventCard: true,
      },
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

/**
 * PATCH /api/sessions/:sessionId
 * Admin: update session label or mark as processed.
 */
router.patch('/:sessionId', requireAdmin, async (req, res) => {
  const { label, processed } = req.body;

  try {
    const session = await prisma.session.update({
      where: { id: req.params.sessionId },
      data: {
        ...(label !== undefined && { label }),
        ...(processed !== undefined && { processed }),
      },
    });

    res.json({ session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

module.exports = router;
