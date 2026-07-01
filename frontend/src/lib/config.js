// Central backend URL config.
// In production, set VITE_BACKEND_URL (see .env.production).
// In local dev it falls back to the local backend so `npm run dev` works.
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// URL that kicks off the Twitch OAuth flow on the backend.
export const twitchLoginUrl = () => `${BACKEND_URL}/auth/twitch`;
