/**
 * reconcile-ambassador-registrations.ts
 *
 * Reconciles registrations that are ambassador-sourced and stuck in a
 * PENDING_ADMIN or PENDING_AMBASSADOR review state without being rejected.
 *
 * Scope (never modified outside this set):
 *   source          = AMBASSADOR
 *   reviewStatus    IN ['PENDING_ADMIN', 'PENDING_AMBASSADOR']
 *   status          != 'REJECTED'
 *
 * Dry-run (default):
 *   Prints the count and review-status breakdown of matching records.
 *   No data is modified.
 *
 * Apply mode (--apply flag):
 *   Inside a single transaction:
 *     - Sets reviewStatus  => 'APPROVED'
 *     - Sets seatReserved  => true
 *     - Sets ambassadorApprovedAt => now()  (only where currently null)
 *   Never changes a payment status to PAID.
 *   Never touches public registrations or rejected registrations.
 *   Prints the actual update count on completion.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/reconcile-ambassador-registrations.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/reconcile-ambassador-registrations.ts --apply
 */

import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');

async function main() {
  const WHERE = {
    source: 'AMBASSADOR' as const,
    reviewStatus: {
      in: ['PENDING_ADMIN', 'PENDING_AMBASSADOR'] as ['PENDING_ADMIN', 'PENDING_AMBASSADOR'],
    },
    status: { not: 'REJECTED' as const },
  };

  // -- Dry-run report --
  const matches = await prisma.registration.findMany({
    where: WHERE,
    select: { id: true, reviewStatus: true },
  });

  const total = matches.length;
  const breakdown: Record<string, number> = {};
  for (const reg of matches) {
    breakdown[reg.reviewStatus] = (breakdown[reg.reviewStatus] ?? 0) + 1;
  }

  console.log('-'.repeat(60));
  console.log('Reconcile Ambassador Registrations -- Dry-Run Report');
  console.log('-'.repeat(60));
  console.log('Matching records : ' + total);
  console.log('Review-status breakdown:');
  for (const [status, count] of Object.entries(breakdown)) {
    console.log('  ' + status.padEnd(24) + ' ' + count);
  }

  if (total === 0) {
    console.log('\nNo records require reconciliation. Exiting.');
    return;
  }

  if (!APPLY) {
    console.log(
      '\nThis is a DRY RUN. No data was modified.' +
        '\nRe-run with --apply to commit these changes.'
    );
    return;
  }

  // -- Apply --
  console.log('\nApplying updates inside a transaction...');

  const now = new Date();
  const matchIds = matches.map((r) => r.id);

  const result = await prisma.$transaction(async (tx) => {
    // Set reviewStatus and seatReserved for all matching records.
    const updateAll = await tx.registration.updateMany({
      where: WHERE,
      data: {
        reviewStatus: 'APPROVED',
        seatReserved: true,
      },
    });

    // Set ambassadorApprovedAt only where it is currently null.
    const updateTimestamp = await tx.registration.updateMany({
      where: {
        id: { in: matchIds },
        ambassadorApprovedAt: null,
      },
      data: {
        ambassadorApprovedAt: now,
      },
    });

    return {
      updated: updateAll.count,
      timestampSet: updateTimestamp.count,
    };
  });

  console.log('-'.repeat(60));
  console.log('Reconciliation complete.');
  console.log('Records updated        : ' + result.updated);
  console.log('ambassadorApprovedAt   : set on ' + result.timestampSet + ' record(s)');
  console.log('-'.repeat(60));
}

main()
  .catch((err) => {
    console.error('[reconcile-ambassador-registrations] Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
