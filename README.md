# MCW — Marbles Championship Wrestling

> Where every roll counts.

Track your marble's wrestling career — automatically generated from live Marbles on Stream race results.

---

## Project Structure

```
MCW/
├── backend/     Express API + Prisma + Twitch OAuth
├── frontend/    React + Vite website
└── watcher/     PC-side script that reads MoS save files
```

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your Twitch Client ID/Secret and set WATCHER_API_KEY
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Backend runs on http://localhost:3001

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### 3. Watcher (run on streaming PC during stream)

```bash
cd watcher
npm install
cp .env.example .env
# Edit .env — set MCW_API_KEY (must match backend WATCHER_API_KEY) and MOS_SESSIONS_PATH
node watcher.js
```

---

## Getting Twitch OAuth Credentials

1. Go to https://dev.twitch.tv/console
2. Create a new Application
3. Set OAuth Redirect URL to: `http://localhost:3001/auth/twitch/callback`
4. Copy Client ID and generate a Client Secret
5. Paste both into `backend/.env`

---

## First Admin Setup

After logging in once via Twitch, run this in the backend folder to grant yourself admin:

```bash
# Find your viewer ID via Prisma Studio
npm run db:studio

# Or via the API — POST /api/admin/viewers/:yourViewerId/make-admin
# (requires you to manually set isAdmin: true in the DB for the first admin)
```

To bootstrap the first admin directly in the database:
```bash
cd backend
npx prisma studio
# Open the Viewer table and set isAdmin to true for your account
```

---

## Build Phases

- [x] **Phase 1** — Backend + DB + Twitch OAuth + Watcher + Race storage
- [x] **Phase 2** — Wrestling engine (win/loss, streaks, rivalries, championship logic)
- [ ] **Phase 3** — Full site pages (leaderboard ✓, profiles ✓, event recaps)
- [ ] **Phase 4** — Character creator (modular art assets)
- [ ] **Phase 5** — Admin panel UI
- [ ] **Phase 6** — Factions, promos, 24/7 title, OBS overlay
