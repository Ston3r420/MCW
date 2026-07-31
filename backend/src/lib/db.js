const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

let prisma;

try {
  prisma = new PrismaClient();
} catch (err) {
  console.warn('[DB] PrismaClient init warning:', err.message);
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d) => d?.data ?? {},
    createMany: async () => ({ count: 0 }),
    update: async (d) => d?.data ?? {},
    updateMany: async () => ({ count: 0 }),
    upsert: async (d) => d?.create ?? {},
    delete: async () => ({}),
    deleteMany: async () => ({ count: 0 }),
    count: async () => 0,
  };
  prisma = new Proxy({}, { get: () => noOp });
}

let dbInitialized = false;

async function initDb() {
  if (dbInitialized) return;
  
  try {
    const schemaPath = path.join(__dirname, '..', '..', 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      console.log('[DB] Ensuring database schema is synced...');
      execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
        stdio: 'ignore',
      });
      
      // Check if belts need seeding
      const count = await prisma.belt.count();
      if (count === 0) {
        console.log('[DB] Seeding default championship belts...');
        const belts = [
          {
            name: 'MCW World Championship',
            shortName: 'World Title',
            description: 'The most prestigious title in MCW. Held by the most dominant marble overall.',
          },
          {
            name: 'MCW Hardcore Title',
            shortName: 'Hardcore Title',
            description: 'Chaos and momentum based. For the wildest, most unpredictable marbles.',
          },
          {
            name: 'MCW 24/7 Title',
            shortName: '24/7 Title',
            description: 'Changes hands unpredictably. Maximum chaos.',
          },
          {
            name: 'MCW Meme Belt',
            shortName: 'Meme Belt',
            description: 'Community voted. Special circumstances only.',
          },
        ];

        for (const belt of belts) {
          await prisma.belt.upsert({
            where: { name: belt.name },
            update: {},
            create: belt,
          });
        }
      }
    }
    dbInitialized = true;
  } catch (err) {
    console.warn('[DB] Auto-sync skipped or failed:', err.message);
  }
}

module.exports = { prisma, initDb };
