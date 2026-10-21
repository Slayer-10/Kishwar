import { prisma } from '../lib/prisma';

async function verify() {
  const admin = await prisma.user.findUnique({
    where: { email: 'alizafar2543@gmail.com' },
    select: { id: true, email: true, role: true, isActive: true },
  });

  console.log('\n=== POST-CLEANUP VERIFICATION ===\n');

  if (!admin) {
    console.error('❌ ADMIN NOT FOUND');
    process.exit(1);
  }
  console.log(`✅ Admin:       ${admin.email} [${admin.role}] active=${admin.isActive}`);
  console.log(`   ID:          ${admin.id}`);

  const counts: Record<string, number> = {
    User:                 await prisma.user.count(),
    Participant:          await prisma.participant.count(),
    Ambassador:           await prisma.ambassador.count(),
    FDO:                  await prisma.fDO.count(),
    AmbassadorRequest:    await prisma.ambassadorRequest.count(),
    University:           await prisma.university.count(),
    Event:                await prisma.event.count(),
    Team:                 await prisma.team.count(),
    TeamMember:           await prisma.teamMember.count(),
    Registration:         await prisma.registration.count(),
    RegistrationEvidence: await prisma.registrationEvidence.count(),
    Invoice:              await prisma.invoice.count(),
    CollectiveInvoice:    await prisma.collectiveInvoice.count(),
    CollectiveInvoiceItem:await prisma.collectiveInvoiceItem.count(),
    Payment:              await prisma.payment.count(),
    CampusPayment:        await prisma.campusPayment.count(),
    Ticket:               await prisma.ticket.count(),
    AuditLog:             await prisma.auditLog.count(),
    NotificationLog:      await prisma.notificationLog.count(),
    Announcement:         await prisma.announcement.count(),
    DiscountTier:         await prisma.discountTier.count(),
  };

  const EXPECTED_ZERO = [
    'Ambassador','FDO','AmbassadorRequest','University','Event','Team','TeamMember',
    'Registration','RegistrationEvidence','Invoice','CollectiveInvoice','CollectiveInvoiceItem',
    'Payment','CampusPayment','Ticket','AuditLog','NotificationLog','Announcement',
  ];

  console.log('\n--- Record Counts ---');
  let allGood = true;
  for (const [k, v] of Object.entries(counts)) {
    const expected = k === 'User' ? 1 : k === 'DiscountTier' ? undefined : 0;
    const pass = expected === undefined
      ? '✅'
      : v === expected ? '✅' : '❌';
    if (pass === '❌') allGood = false;
    console.log(`  ${pass} ${k.padEnd(24)} ${v}${expected !== undefined ? ` (expected ${expected})` : ' (config, any)'}`);
  }

  console.log('\n' + (allGood ? '✅ All verification checks passed.' : '❌ Some checks failed — review above.'));
}

verify()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
