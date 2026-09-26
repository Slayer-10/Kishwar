import { prisma } from '../lib/prisma';

async function main() {
  const tickets = await prisma.ticket.findMany();

  let fixedCount = 0;
  for (const t of tickets) {
    if (t.ticketCode !== t.qrData) {
      await prisma.ticket.update({
        where: { id: t.id },
        data: { qrData: t.ticketCode },
      });
      console.log(`Fixed ticket ${t.ticketCode} (qrData now matches)`);
      fixedCount++;
    }
  }

  console.log(`Done. Fixed ${fixedCount} mismatched ticket(s) out of ${tickets.length} total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
