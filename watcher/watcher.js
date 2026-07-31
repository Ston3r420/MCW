require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');
const crypto = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = process.env.MCW_API_URL || 'http://localhost:3001';
const API_KEY = process.env.MCW_API_KEY;
const MOS_PATH = process.env.MOS_SESSIONS_PATH || path.join(
  process.env.LOCALAPPDATA || '',
  'MarblesOnStream', 'Saved', 'SaveGames', 'Sessions'
);
const DEBUG = process.env.DEBUG === 'true';

if (!API_KEY) {
  console.error('❌ MCW_API_KEY is not set in .env — watcher will not be able to authenticate.');
  process.exit(1);
}

if (!fs.existsSync(MOS_PATH)) {
  console.error(`❌ Marbles on Stream sessions folder not found: ${MOS_PATH}`);
  console.error('   Update MOS_SESSIONS_PATH in your .env file.');
  process.exit(1);
}

// ─── State ────────────────────────────────────────────────────────────────────

// Track which files we've already processed (by hash) to avoid double-submission
const processedHashes = new Set();

// Current active session ID from the backend
let currentSessionId = null;
let currentSessionDate = null;

// ─── API helpers ──────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { Authorization: `Bearer ${API_KEY}` },
  timeout: 10000,
});

async function createSession(streamDate, label, hash) {
  const res = await apiClient.post('/api/sessions', {
    streamDate,
    label,
    rawDataHash: hash,
  });
  return res.data.session;
}

async function submitRace(sessionId, raceNumber, results, finishedAt) {
  const res = await apiClient.post('/api/races', {
    sessionId,
    raceNumber,
    finishedAt,
    results,
  });
  return res.data;
}

// ─── File parsing ─────────────────────────────────────────────────────────────

/**
 * Marbles on Stream saves session results as JSON files in the Sessions folder.
 * This parser handles the known file format. Adjust field names if MoS updates its schema.
 *
 * Expected structure (based on community research):
 * {
 *   "RaceResults": [
 *     {
 *       "RaceIndex": 0,
 *       "Timestamp": "...",
 *       "Participants": [
 *         { "PlayerName": "twitchlogin", "Placement": 1 },
 *         ...
 *       ]
 *     }
 *   ]
 * }
 */
/**
 * STRICT Marbles on Stream JSON Parser
 *
 * FAILS LOUDLY on missing/invalid fields.
 * NEVER fabricates placements or race numbers from array indices.
 */
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

function parseMoSFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const parsed = parseMoSData(data);
    if (!parsed) {
      debug(`Skipping ${path.basename(filePath)} — could not parse race results`);
      return null;
    }
    return parsed;
  } catch (err) {
    console.error(`❌ Failed to parse ${path.basename(filePath)}:`, err.message);
    return null;
  }
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ─── Processing ───────────────────────────────────────────────────────────────

async function processFile(filePath) {
  const filename = path.basename(filePath);

  // Only process JSON files
  if (!filename.endsWith('.json')) return;

  const hash = hashFile(filePath);
  if (processedHashes.has(hash)) {
    debug(`Already processed: ${filename}`);
    return;
  }

  console.log(`📄 Processing: ${filename}`);

  const parsed = parseMoSFile(filePath);
  if (!parsed || parsed.races.length === 0) {
    console.log(`   ⚠️  No valid races found in ${filename}`);
    processedHashes.add(hash); // mark so we don't retry
    return;
  }

  try {
    // Create or reuse a session for this file
    const session = await createSession(
      parsed.streamDate,
      `Session from ${filename}`,
      hash
    );

    if (session.duplicate) {
      console.log(`   ♻️  Duplicate session — already processed`);
      processedHashes.add(hash);
      return;
    }

    console.log(`   ✓ Session created: ${session.id}`);

    // Submit each race
    let submitted = 0;
    for (const race of parsed.races) {
      if (race.results.length === 0) continue;

      const result = await submitRace(
        session.id,
        race.raceNumber,
        race.results,
        race.finishedAt
      );

      console.log(
        `   ✓ Race ${race.raceNumber}: ${result.processedResults} marbles ` +
        `(${result.skipped} skipped)`
      );
      submitted++;
    }

    console.log(`   ✅ Done — ${submitted} races submitted from ${filename}`);
    processedHashes.add(hash);

  } catch (err) {
    if (err.response) {
      console.error(`   ❌ API error (${err.response.status}):`, err.response.data);
    } else {
      console.error(`   ❌ Network error:`, err.message);
    }
    // Don't mark as processed — retry on next poll
  }
}

// ─── Watch ────────────────────────────────────────────────────────────────────

async function scanExistingFiles() {
  const files = fs.readdirSync(MOS_PATH)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(MOS_PATH, f));

  // Sort by modified time — process oldest first
  files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

  for (const file of files) {
    await processFile(file);
  }
}

function startWatcher() {
  console.log(`👁️  Watching: ${MOS_PATH}`);
  console.log(`🔗 Backend: ${API_URL}`);
  console.log('─'.repeat(50));

  const watcher = chokidar.watch(path.join(MOS_PATH, '*.json'), {
    persistent: true,
    ignoreInitial: false, // process existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 2000, // wait 2s after last write before processing
      pollInterval: 500,
    },
  });

  watcher
    .on('add', (filePath) => processFile(filePath))
    .on('change', (filePath) => {
      // Re-check changed files (MoS may update the same file during a session)
      const hash = hashFile(filePath);
      if (!processedHashes.has(hash)) {
        processFile(filePath);
      }
    })
    .on('error', (err) => console.error('Watcher error:', err));

  console.log('MCW Watcher is running. Press Ctrl+C to stop.');
}

function debug(msg) {
  if (DEBUG) console.log(`[DEBUG] ${msg}`);
}

// ─── Keepalive ping — prevents Render free tier from sleeping ────────────────

function startKeepalive() {
  const PING_INTERVAL = 10 * 60 * 1000; // every 10 minutes
  setInterval(async () => {
    try {
      await apiClient.get('/health');
      debug('Keepalive ping sent');
    } catch {
      debug('Keepalive ping failed — backend may be down');
    }
  }, PING_INTERVAL);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

startWatcher();
startKeepalive();
