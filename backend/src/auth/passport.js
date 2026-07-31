const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const { prisma } = require('../lib/db');

function configurePassport() {
  const clientID = process.env.TWITCH_CLIENT_ID || 'placeholder_client_id';
  const clientSecret = process.env.TWITCH_CLIENT_SECRET || 'placeholder_client_secret';
  const callbackURL = process.env.TWITCH_CALLBACK_URL || 'http://localhost:3000/auth/twitch/callback';

  if (!process.env.TWITCH_CLIENT_ID) {
    console.warn('⚠️ [Auth Warning] TWITCH_CLIENT_ID is not configured in .env file. Twitch Login will be disabled until set.');
  }

  // ─── Twitch OAuth2 Strategy ─────────────────────────────────────────────────
  passport.use(
    'twitch',
    new OAuth2Strategy(
      {
        authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
        tokenURL: 'https://id.twitch.tv/oauth2/token',
        clientID,
        clientSecret,
        callbackURL,
        scope: 'user:read:email',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Fetch user info from Twitch API
          const response = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Client-Id': process.env.TWITCH_CLIENT_ID,
            },
          });

          const twitchUser = response.data.data[0];
          if (!twitchUser) {
            return done(new Error('Could not retrieve Twitch user data'));
          }

          // Check if this account is blocked
          const blocked = await prisma.blockedAccount.findUnique({
            where: { twitchLogin: twitchUser.login },
          });

          if (blocked) {
            return done(null, false, { message: 'Account is not eligible to participate.' });
          }

          // Upsert the viewer record
          const viewer = await prisma.viewer.upsert({
            where: { twitchId: twitchUser.id },
            update: {
              twitchLogin: twitchUser.login,
              displayName: twitchUser.display_name,
              avatarUrl: twitchUser.profile_image_url,
            },
            create: {
              twitchId: twitchUser.id,
              twitchLogin: twitchUser.login,
              displayName: twitchUser.display_name,
              avatarUrl: twitchUser.profile_image_url,
            },
          });

          // Ensure CareerStats row exists
          await prisma.careerStats.upsert({
            where: { viewerId: viewer.id },
            update: {},
            create: { viewerId: viewer.id },
          });

          return done(null, viewer);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // ─── No session needed — using JWT ─────────────────────────────────────────
  passport.serializeUser((viewer, done) => done(null, viewer.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const viewer = await prisma.viewer.findUnique({ where: { id } });
      done(null, viewer);
    } catch (err) { done(err); }
  });
}

module.exports = { configurePassport };
