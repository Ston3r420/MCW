const { PrismaClient } = require('@prisma/client');
const { getStatusLabel } = require('./wrestlingEngine');

const prisma = new PrismaClient();

/**
 * Builds (and stores) the weekly Event Card recap for a session.
 * The recap turns the raw races into a wrestling "show" summary:
 * main event, title changes, new rivalries, hot/cold streaks, and a
 * "moment of the night" highlight.
 *
 * Returns the stored EventCard row.
 */
async function generateEventCard(sessionId) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      races: {
        orderBy: { raceNumber: 'asc' },
        include: {
          results: {
            include: {
              viewer: { select: { id: true, displayName: true, ringName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!session) throw new Error('Session not found');

  const races = session.races.filter((r) => r.results.length > 0);
  const nameOf = (v) => v.ringName || v.displayName;

  // ─── Per-wrestler tally within this session ─────────────────────────────────
  const tally = new Map(); // viewerId -> { viewer, wins, races, bestPlacement }
  for (const race of races) {
    for (const r of race.results) {
      const t = tally.get(r.viewerId) || { viewer: r.viewer, wins: 0, races: 0, bestPlacement: Infinity };
      t.races += 1;
      if (r.placement === 1) t.wins += 1;
      t.bestPlacement = Math.min(t.bestPlacement, r.placement);
      tally.set(r.viewerId, t);
    }
  }

  // ─── Main event: winner of the final race of the night ──────────────────────
  let mainEvent = null;
  const finalRace = races[races.length - 1];
  if (finalRace) {
    const winner = finalRace.results.find((r) => r.placement === 1);
    mainEvent = {
      raceNumber: finalRace.raceNumber,
      totalMarbles: finalRace.results.length,
      winner: winner ? { ...winner.viewer, name: nameOf(winner.viewer) } : null,
    };
  }

  // ─── Top performers of the night (by session wins) ──────────────────────────
  const topPerformers = [...tally.values()]
    .sort((a, b) => b.wins - a.wins || a.bestPlacement - b.bestPlacement)
    .slice(0, 3)
    .map((t) => ({ ...t.viewer, name: nameOf(t.viewer), wins: t.wins, races: t.races }));

  const participantIds = [...tally.keys()];

  // ─── Title changes since this session started ───────────────────────────────
  const newReigns = await prisma.titleReign.findMany({
    where: { wonAt: { gte: session.createdAt }, viewerId: { in: participantIds } },
    orderBy: { wonAt: 'asc' },
    include: {
      belt: { select: { id: true, name: true, shortName: true } },
      viewer: { select: { id: true, displayName: true, ringName: true, avatarUrl: true } },
    },
  });
  // Keep only the final holder per belt for the night (titles can flip
  // several times across a session — we only recap where it ended up).
  const latestByBelt = new Map();
  for (const reign of newReigns) latestByBelt.set(reign.belt.id, reign);
  const titleChanges = [...latestByBelt.values()].map((reign) => ({
    belt: reign.belt.name,
    shortName: reign.belt.shortName,
    newChampion: { ...reign.viewer, name: nameOf(reign.viewer) },
  }));

  // ─── Rivalries freshly triggered / heated during this session ───────────────
  const heatedRivalries = await prisma.rivalry.findMany({
    where: {
      updatedAt: { gte: session.createdAt },
      closeFinishes: { gte: 3 },
      viewerAId: { in: participantIds },
      viewerBId: { in: participantIds },
    },
    include: {
      viewerA: { select: { id: true, displayName: true, ringName: true } },
      viewerB: { select: { id: true, displayName: true, ringName: true } },
    },
    orderBy: { closeFinishes: 'desc' },
    take: 5,
  });
  const newRivalries = heatedRivalries.map((r) => ({
    a: nameOf(r.viewerA),
    b: nameOf(r.viewerB),
    closeFinishes: r.closeFinishes,
    encounters: r.encounters,
  }));

  // ─── Hot & cold streaks among tonight's competitors ─────────────────────────
  const stats = await prisma.careerStats.findMany({
    where: { viewerId: { in: participantIds } },
    include: { viewer: { select: { id: true, displayName: true, ringName: true } } },
  });
  const hotStreaks = stats
    .filter((s) => s.currentStreak >= 3)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .map((s) => ({ name: nameOf(s.viewer), streak: s.currentStreak, label: getStatusLabel(s.currentStreak, s.wins, s.losses) }));
  const coldStreaks = stats
    .filter((s) => s.currentStreak <= -3)
    .sort((a, b) => a.currentStreak - b.currentStreak)
    .map((s) => ({ name: nameOf(s.viewer), streak: s.currentStreak, label: getStatusLabel(s.currentStreak, s.wins, s.losses) }));

  // ─── Moment of the night ────────────────────────────────────────────────────
  let momentOfTheNight = null;
  const bigWinner = topPerformers[0];
  if (titleChanges.length > 0) {
    const tc = titleChanges[0];
    momentOfTheNight = `${tc.newChampion.name} captured the ${tc.shortName}!`;
  } else if (bigWinner && bigWinner.wins >= 2) {
    momentOfTheNight = `${bigWinner.name} dominated the night with ${bigWinner.wins} wins across ${bigWinner.races} races.`;
  } else if (mainEvent?.winner) {
    momentOfTheNight = `${mainEvent.winner.name} took the main event in front of the marble faithful.`;
  } else {
    momentOfTheNight = 'A chaotic night in the MCW ring.';
  }

  const data = {
    label: session.label,
    streamDate: session.streamDate,
    totalRaces: races.length,
    totalWrestlers: participantIds.length,
    mainEvent,
    topPerformers,
    titleChanges,
    newRivalries,
    hotStreaks,
    coldStreaks,
    momentOfTheNight,
  };

  const card = await prisma.eventCard.upsert({
    where: { sessionId },
    update: { data, generatedAt: new Date() },
    create: { sessionId, data },
  });

  await prisma.session.update({ where: { id: sessionId }, data: { processed: true } });

  return card;
}

module.exports = { generateEventCard };
