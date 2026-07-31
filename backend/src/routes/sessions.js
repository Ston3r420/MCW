const express = require('express');
const { prisma } = require('../lib/db');
const { requireWatcherKey, requireAdmin, requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

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

// Helper function to strictly parse MoS JSON data without fabricating fields
function parseMoSData(data) {
  if (!data || typeof data !== 'object') {
    console.error('❌ [MoS Parser Error] Invalid or empty JSON payload provided');
    return null;
  }

  let rawRaces = null;
  if (Array.isArray(data)) {
    rawRaces = data;
  } else if (Array.isArray(data.RaceResults)) {
    rawRaces = data.RaceResults;
  } else if (Array.isArray(data.races)) {
    rawRaces = data.races;
  } else {
    console.error('❌ [MoS Parser Error] Root JSON must contain a "RaceResults" or "races" array');
    return null;
  }

  if (rawRaces.length === 0) {
    console.error('❌ [MoS Parser Error] Race array is empty');
    return null;
  }

  const races = [];

  for (let i = 0; i < rawRaces.length; i++) {
    const race = rawRaces[i];
    if (!race || typeof race !== 'object') {
      console.error(`❌ [MoS Parser Error] Race at index ${i} is not a valid object`);
      return null;
    }

    // 1. Strict Race Number Extraction (NO INDEX FALLBACK)
    let raceNumber = null;
    if (typeof race.RaceIndex === 'number' && Number.isInteger(race.RaceIndex) && race.RaceIndex >= 0) {
      raceNumber = race.RaceIndex + 1;
    } else if (typeof race.RaceNumber === 'number' && Number.isInteger(race.RaceNumber) && race.RaceNumber > 0) {
      raceNumber = race.RaceNumber;
    } else if (typeof race.raceNumber === 'number' && Number.isInteger(race.raceNumber) && race.raceNumber > 0) {
      raceNumber = race.raceNumber;
    }

    if (raceNumber === null) {
      console.error(`❌ [MoS Parser Error] Race at index ${i} is missing a valid "RaceIndex" or "RaceNumber". Refusing to fabricate race number.`);
      return null;
    }

    // 2. Strict Timestamp Extraction
    const tsVal = race.Timestamp || race.timestamp || race.FinishedAt || race.finishedAt;
    if (!tsVal) {
      console.error(`❌ [MoS Parser Error] Race ${raceNumber} is missing a valid "Timestamp".`);
      return null;
    }
    const parsedDate = new Date(tsVal);
    if (isNaN(parsedDate.getTime())) {
      console.error(`❌ [MoS Parser Error] Race ${raceNumber} has an unparseable Timestamp: "${tsVal}"`);
      return null;
    }
    const finishedAt = parsedDate.toISOString();

    // 3. Strict Participants Array Check
    const rawParticipants = race.Participants || race.participants;
    if (!Array.isArray(rawParticipants) || rawParticipants.length === 0) {
      console.error(`❌ [MoS Parser Error] Race ${raceNumber} has no valid "Participants" array`);
      return null;
    }

    const results = [];
    for (let j = 0; j < rawParticipants.length; j++) {
      const p = rawParticipants[j];
      if (!p || typeof p !== 'object') {
        console.error(`❌ [MoS Parser Error] Race ${raceNumber}, participant ${j} is invalid`);
        return null;
      }

      // Strict Twitch login / Player Name
      const nameVal = p.PlayerName || p.playerName || p.TwitchLogin || p.twitchLogin || '';
      const twitchLogin = String(nameVal).toLowerCase().trim();
      if (!twitchLogin) {
        console.error(`❌ [MoS Parser Error] Race ${raceNumber}, participant at index ${j} is missing "PlayerName" / "twitchLogin"`);
        return null;
      }

      // Strict Placement (NO INDEX FALLBACK)
      const placeVal = p.Placement ?? p.placement;
      if (typeof placeVal !== 'number' || !Number.isInteger(placeVal) || placeVal <= 0) {
        console.error(`❌ [MoS Parser Error] Race ${raceNumber}, player "${twitchLogin}" is missing a valid positive integer "Placement" (found: ${placeVal}). Refusing to invent placement from array index.`);
        return null;
      }

      results.push({
        twitchLogin,
        displayName: p.PlayerName || twitchLogin,
        placement: placeVal,
      });
    }

    races.push({ raceNumber, finishedAt, results });
  }

  const streamDate = races[0].finishedAt;

  return { races, streamDate };
}

// ─── Upload Marbles on Stream JSON session file via Web UI ────────────────────
router.post('/upload-json', requireAuth, async (req, res) => {
  try {
    const { sessionData, label } = req.body;
    if (!sessionData) {
      return res.status(400).json({ error: 'No sessionData provided' });
    }

    const data = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    const parsed = parseMoSData(data);

    if (!parsed || !parsed.races || parsed.races.length === 0) {
      return res.status(400).json({ error: 'Could not parse race results from the provided JSON file.' });
    }

    const { processRaceResult } = require('../services/wrestlingEngine');
    const crypto = require('crypto');
    const rawDataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

    // Deduplicate
    let session = await prisma.session.findFirst({ where: { rawDataHash } });
    if (session) {
      return res.status(200).json({ session, duplicate: true, message: 'Session was already imported previously.' });
    }

    session = await prisma.session.create({
      data: {
        streamDate: new Date(parsed.streamDate),
        label: label || `Imported Session (${new Date().toLocaleDateString()})`,
        rawDataHash,
      },
    });

    let totalRacesImported = 0;

    for (const race of parsed.races) {
      if (!race.results || race.results.length === 0) continue;

      const raceRecord = await prisma.race.create({
        data: {
          sessionId: session.id,
          raceNumber: race.raceNumber,
          finishedAt: new Date(race.finishedAt),
        },
      });

      const resultRows = [];
      for (const p of race.results) {
        let viewer = await prisma.viewer.findFirst({ where: { twitchLogin: p.twitchLogin } });
        if (!viewer) {
          viewer = await prisma.viewer.create({
            data: {
              twitchId: `imported_${p.twitchLogin}`,
              twitchLogin: p.twitchLogin,
              displayName: p.displayName || p.twitchLogin,
            },
          });
          await prisma.careerStats.create({
            data: { viewerId: viewer.id },
          });
        }

        const resultRow = await prisma.raceResult.create({
          data: {
            raceId: raceRecord.id,
            viewerId: viewer.id,
            placement: p.placement,
            totalMarbles: race.results.length,
          },
        });
        resultRows.push(resultRow);
      }

      await processRaceResult(raceRecord.id, resultRows);
      totalRacesImported++;
    }

    res.status(201).json({
      session,
      totalRacesImported,
      message: `Successfully imported ${totalRacesImported} races!`,
    });
  } catch (err) {
    console.error('Session upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to import session file' });
  }
});

module.exports = router;
