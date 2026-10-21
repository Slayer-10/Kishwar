import { prisma } from '../lib/prisma';
async function main() {
  const participants = await prisma.participant.findMany({
    select: { id: true, email: true, fullName: true, userId: true },
  });
  console.log('Remaining Participant rows:', JSON.stringify(participants, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
