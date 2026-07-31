const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create the championship belts
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
    console.log(`  ✓ Belt: ${belt.name}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
