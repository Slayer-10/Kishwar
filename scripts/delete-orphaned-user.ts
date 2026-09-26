import { prisma } from '../lib/prisma';

async function main() {
  const email = 'albusnape@gmail.com';

  const user = await prisma.user.findUnique({
    where: { email },
    include: { participant: true },
  });

  if (!user) {
    console.log('No user found with that email. Nothing to do.');
    return;
  }

  if (user.participant) {
    console.log('This user actually has a Participant row — aborting, this is not the orphaned account.');
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Deleted orphaned user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
