require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const passport = require('passport');
const { createServer: createViteServer } = require('vite');

const { configurePassport } = require('./auth/passport');
const authRoutes = require('./routes/auth');
const viewerRoutes = require('./routes/viewers');
const raceRoutes = require('./routes/races');
const sessionRoutes = require('./routes/sessions');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const { initDb } = require('./lib/db');

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  // Initialize DB schema & seed default belts
  await initDb().catch((err) => console.warn('[DB] Init warning:', err.message));

  // ─── Middleware ───────────────────────────────────────────────────────────────

  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json());

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    },
  }));

  // ─── Passport ────────────────────────────────────────────────────────────────

  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // ─── API Routes ──────────────────────────────────────────────────────────────

  app.use('/auth', authRoutes);
  app.use('/api/viewers', viewerRoutes);
  app.use('/api/races', raceRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/admin', adminRoutes);

  // ─── Health check ─────────────────────────────────────────────────────────────

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Vite Middleware (Development) / Static Serving (Production) ───────────

  if (process.env.NODE_ENV !== 'production') {
    const frontendDir = path.join(__dirname, '..', '..', 'frontend');
    const vite = await createViteServer({
      root: frontendDir,
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(PORT),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ─── Error handler ────────────────────────────────────────────────────────────

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  // ─── Start ────────────────────────────────────────────────────────────────────

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MCW Server running on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Auto-start session file watcher in background if enabled
    if (process.env.ENABLE_WATCHER === 'true' || process.env.MOS_SESSIONS_PATH) {
      const watcherPath = path.join(__dirname, '..', '..', 'watcher', 'watcher.js');
      if (require('fs').existsSync(watcherPath)) {
        console.log('🤖 Auto-starting Marbles session watcher in background...');
        const { fork } = require('child_process');
        const watcherProc = fork(watcherPath, [], {
          env: {
            ...process.env,
            MCW_API_URL: process.env.MCW_API_URL || `http://localhost:${PORT}`,
          },
        });
        watcherProc.on('error', (err) => console.error('Watcher process error:', err.message));
      }
    }
  });
}

startServer();
