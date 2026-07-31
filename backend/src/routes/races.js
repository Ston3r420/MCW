const express = require('express');
const { prisma } = require('../lib/db');
const { requireWatcherKey } = require('../middleware/requireAuth');
const { processRaceResult } = require('../services/wrestlingEngine');

const router = express.Router();

/**
 * POST /api/races
 * Called by the watcher script after each race.
 * Expects:
 * {
 *   sessionId: string,
 *   raceNumber: number,
 *   finishedAt: ISO string (optional),
 *   results: [
 *     { twitchLogin: string, placement: number },
 *     ...
 *   ]
 * }
 */
router.post('/', requireWatcherKey, async (req, res) => {
  const { sessionId, raceNumber, finishedAt, results } = req.body;

  // Validate required fields
  if (!sessionId || typeof raceNumber !== 'number' || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'sessionId, raceNumber, and results array are required' });
  }

  // Validate each result entry
  for (const r of results) {
    if (!r.twitchLogin || typeof r.placement !== 'number') {
      return res.status(400).json({ error: 'Each result must have twitchLogin and placement' });
    }
  }

  try {
    // Verify session exists
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all non-blocked viewers that match the incoming logins
    const logins = results.map((r) => r.twitchLogin.toLowerCase());
    const viewers = await prisma.viewer.findMany({
      where: {
        twitchLogin: { in: logins },
        isBlocked: false,
      },
    });

    const viewerMap = new Map(viewers.map((v) => [v.twitchLogin, v]));
    const totalMarbles = results.length;

    // Create the race record
    const race = await prisma.race.create({
      data: {
        sessionId,
        raceNumber,
        finishedAt: finishedAt ? new Date(finishedAt) : new Date(),
      },
    });

    // Create result rows for known (non-blocked) viewers only
    const resultRows = [];
    for (const r of results) {
      const viewer = viewerMap.get(r.twitchLogin.toLowerCase());
      if (!viewer) continue; // unknown or blocked — skip silently

      resultRows.push({
        raceId: race.id,
        viewerId: viewer.id,
        placement: r.placement,
        totalMarbles,
      });
    }

    if (resultRows.length > 0) {
      await prisma.raceResult.createMany({ data: resultRows });
    }

    // Run the wrestling engine to update stats, streaks, rivalries
    await processRaceResult(race.id, resultRows);

    res.status(201).json({
      success: true,
      raceId: race.id,
      processedResults: resultRows.length,
      skipped: results.length - resultRows.length,
    });
  } catch (err) {
    console.error('Error processing race result:', err);
    res.status(500).json({ error: 'Failed to process race result' });
  }
});

/**
 * GET /api/races/:raceId
 * Returns a single race with all results.
 */
router.get('/:raceId', async (req, res) => {
  try {
    const race = await prisma.race.findUnique({
      where: { id: req.params.raceId },
      include: {
        session: { select: { id: true, streamDate: true, label: true } },
        results: {
          orderBy: { placement: 'asc' },
          include: {
            viewer: {
              select: { id: true, displayName: true, ringName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!race) return res.status(404).json({ error: 'Race not found' });
    res.json({ race });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch race' });
  }
});

module.exports = router;
