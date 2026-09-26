import { prisma } from '../lib/prisma';

async function main() {
  const participants = await prisma.participant.findMany({ include: { user: true } });

  for (const p of participants) {
    await prisma.participant.update({
      where: { id: p.id },
      data: { email: p.user.email },
    });
    console.log(`Backfilled ${p.user.email}`);
  }

  console.log(`Done. Backfilled ${participants.length} participant(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
