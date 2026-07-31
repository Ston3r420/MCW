const { prisma } = require('../lib/db');

// ─── Constants ────────────────────────────────────────────────────────────────

const RIVALRY_CLOSE_FINISH_THRESHOLD = 3; // within 3 spots = close finish
const RIVALRY_TRIGGER_CLOSE_FINISHES = 3; // 3 close finishes = rivalry detected
const STREAK_PUSH_THRESHOLD = 5;
const STREAK_JOBBER_THRESHOLD = -5;
const TOP_3_CONTENDER_RACES = 5; // track last N races for contender status

/**
 * Main entry point — called after each race is saved to the DB.
 * Updates win/loss records, streaks, rivalries, and championship logic.
 */
async function processRaceResult(raceId, resultRows) {
  if (!resultRows || resultRows.length === 0) return;

  // Load full result data
  const results = await prisma.raceResult.findMany({
    where: { raceId },
    include: { viewer: true },
  });

  const totalMarbles = results[0]?.totalMarbles || results.length;

  // Process each participant
  for (const result of results) {
    await updateCareerStats(result, totalMarbles);
  }

  // Detect new rivalries between participants
  await detectRivalries(results);

  // Update championship (World Title holder = most wins overall)
  await updateWorldChampion();
}

// ─── Career Stats ─────────────────────────────────────────────────────────────

async function updateCareerStats(result, totalMarbles) {
  const isWin = result.placement === 1;
  const isLoss = result.placement > 1;

  // Fetch current stats
  const stats = await prisma.careerStats.findUnique({
    where: { viewerId: result.viewerId },
  });

  if (!stats) return; // shouldn't happen — created at login

  const currentStreak = stats.currentStreak;

  let newStreak;
  if (isWin) {
    // Win: positive streak increments, negative streak resets to 1
    newStreak = currentStreak > 0 ? currentStreak + 1 : 1;
  } else {
    // Loss: negative streak decrements, positive streak resets to -1
    newStreak = currentStreak < 0 ? currentStreak - 1 : -1;
  }

  const newLongestWin = isWin
    ? Math.max(stats.longestWinStreak, newStreak)
    : stats.longestWinStreak;

  const newLongestLoss = !isWin
    ? Math.max(stats.longestLossStreak, Math.abs(newStreak))
    : stats.longestLossStreak;

  await prisma.careerStats.update({
    where: { viewerId: result.viewerId },
    data: {
      wins: isWin ? { increment: 1 } : undefined,
      losses: isLoss ? { increment: 1 } : undefined,
      totalRaces: { increment: 1 },
      currentStreak: newStreak,
      longestWinStreak: newLongestWin,
      longestLossStreak: newLongestLoss,
    },
  });
}

// ─── Rivalry Detection ────────────────────────────────────────────────────────

async function detectRivalries(results) {
  // Compare every pair of participants
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];

      // Ensure consistent ordering (smaller id first) for the unique constraint
      const [idA, idB] = [a.viewerId, b.viewerId].sort();
      const placementDiff = Math.abs(a.placement - b.placement);
      const isCloseFinish = placementDiff <= RIVALRY_CLOSE_FINISH_THRESHOLD;

      // Upsert rivalry record
      const rivalry = await prisma.rivalry.upsert({
        where: {
          viewerAId_viewerBId: { viewerAId: idA, viewerBId: idB },
        },
        update: {
          encounters: { increment: 1 },
          closeFinishes: isCloseFinish ? { increment: 1 } : undefined,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          viewerAId: idA,
          viewerBId: idB,
          encounters: 1,
          closeFinishes: isCloseFinish ? 1 : 0,
          isActive: true,
        },
      });

      // Log to console when a rivalry is freshly triggered
      if (
        rivalry.closeFinishes === RIVALRY_TRIGGER_CLOSE_FINISHES &&
        isCloseFinish
      ) {
        console.log(
          `🔥 RIVALRY DETECTED: ${a.viewer?.displayName} vs ${b.viewer?.displayName} (${rivalry.closeFinishes} close finishes)`
        );
      }
    }
  }
}

// ─── World Championship Logic ─────────────────────────────────────────────────

async function updateWorldChampion() {
  // The World Champion is whoever has the most wins
  // Get all non-blocked viewer IDs first, then find top stats among them
  const eligibleViewers = await prisma.viewer.findMany({
    where: { isBlocked: false },
    select: { id: true },
  });
  const eligibleIds = eligibleViewers.map((v) => v.id);

  const topStats = await prisma.careerStats.findFirst({
    orderBy: { wins: 'desc' },
    where: { viewerId: { in: eligibleIds } },
    include: { viewer: { select: { id: true, displayName: true, ringName: true } } },
  });

  if (!topStats) return;

  // Find the World Championship belt
  const worldBelt = await prisma.belt.findFirst({
    where: { name: 'MCW World Championship', isActive: true },
  });

  if (!worldBelt) return;

  // Check who currently holds it
  const currentReign = await prisma.titleReign.findFirst({
    where: { beltId: worldBelt.id, lostAt: null },
  });

  // If they already hold it, nothing to do
  if (currentReign && currentReign.viewerId === topStats.viewerId) return;

  // Title change!
  const now = new Date();

  if (currentReign) {
    await prisma.titleReign.update({
      where: { id: currentReign.id },
      data: { lostAt: now },
    });
  }

  await prisma.titleReign.create({
    data: {
      beltId: worldBelt.id,
      viewerId: topStats.viewerId,
      wonAt: now,
    },
  });

  console.log(
    `🏆 NEW WORLD CHAMPION: ${topStats.viewer.ringName || topStats.viewer.displayName}`
  );
}

// ─── Helpers (used by event card generator later) ─────────────────────────────

/**
 * Returns the wrestling status label for a given streak value.
 */
function getStatusLabel(streak, wins, losses) {
  if (streak >= 10) return 'UNSTOPPABLE';
  if (streak >= 5) return 'On a Push';
  if (streak >= 3) return 'Hot Streak';
  if (streak <= -10) return 'Absolute Jobber';
  if (streak <= -5) return 'Enhancement Talent';
  if (streak <= -3) return 'Cold Streak';

  const totalRaces = wins + losses;
  if (totalRaces < 5) return 'Newcomer';

  const winRate = wins / totalRaces;
  if (winRate >= 0.6) return 'Contender';
  if (winRate <= 0.3) return 'Jobber';
  return 'Mid-Card';
}

module.exports = { processRaceResult, getStatusLabel };
