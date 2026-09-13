import { prisma } from '../lib/prisma';

const EMAIL_TO_PROMOTE = 'elbusnape@gmail.com';

async function main() {
  const user = await prisma.user.update({
    where: { email: EMAIL_TO_PROMOTE },
    data: { role: 'SUPER_ADMIN' },
  });
  console.log('Promoted to SUPER_ADMIN:', user.email, user.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
