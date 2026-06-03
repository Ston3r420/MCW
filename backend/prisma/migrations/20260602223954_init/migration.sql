-- CreateTable
CREATE TABLE "Viewer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "twitchId" TEXT NOT NULL,
    "twitchLogin" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "ringName" TEXT,
    "hometown" TEXT,
    "bio" TEXT,
    "characterData" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamDate" DATETIME NOT NULL,
    "label" TEXT,
    "rawDataHash" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "raceNumber" INTEGER NOT NULL,
    "finishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Race_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raceId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "totalMarbles" INTEGER NOT NULL,
    CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RaceResult_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareerStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viewerId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestWinStreak" INTEGER NOT NULL DEFAULT 0,
    "longestLossStreak" INTEGER NOT NULL DEFAULT 0,
    "totalRaces" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CareerStats_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Belt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TitleReign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "beltId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "wonAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lostAt" DATETIME,
    "defenses" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TitleReign_beltId_fkey" FOREIGN KEY ("beltId") REFERENCES "Belt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TitleReign_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rivalry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viewerAId" TEXT NOT NULL,
    "viewerBId" TEXT NOT NULL,
    "encounters" INTEGER NOT NULL DEFAULT 0,
    "closeFinishes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rivalry_viewerAId_fkey" FOREIGN KEY ("viewerAId") REFERENCES "Viewer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rivalry_viewerBId_fkey" FOREIGN KEY ("viewerBId") REFERENCES "Viewer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL,
    CONSTRAINT "EventCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlockedAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "twitchLogin" TEXT NOT NULL,
    "reason" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Viewer_twitchId_key" ON "Viewer"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerStats_viewerId_key" ON "CareerStats"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Belt_name_key" ON "Belt"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Rivalry_viewerAId_viewerBId_key" ON "Rivalry"("viewerAId", "viewerBId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCard_sessionId_key" ON "EventCard"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedAccount_twitchLogin_key" ON "BlockedAccount"("twitchLogin");
