/**
 * TEST DATABASE CLEANUP SCRIPT
 * 
 * Preserves: alizafar2543@gmail.com (SUPER_ADMIN) and its Supabase Auth identity.
 * Deletes: ALL other application data, test accounts, and storage files.
 * 
 * Rules:
 * - No schema changes, no migrations, no source code changes.
 * - No prisma migrate reset.
 * - Performs DB deletes in FK-safe order inside a transaction where possible.
 * - Supabase Auth and Storage are handled separately (they cannot be in the same
 *   Postgres transaction).
 * - Stops and reports on any unexpected blocker.
 */
import { prisma } from '../lib/prisma';
import { createClient } from '@supabase/supabase-js';

const PRESERVED_ADMIN_EMAIL = 'alizafar2543@gmail.com';

// ─── Supabase Admin Client (service role) ────────────────────────────────────
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(msg: string) { console.log(msg); }
function section(title: string) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  log('\n========================================');
  log('  TEST DATABASE CLEANUP');
  log('========================================');

  // 1. Identify and lock the preserved admin
  const admin = await prisma.user.findUnique({
    where: { email: PRESERVED_ADMIN_EMAIL },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!admin) {
    console.error(`❌ FATAL: Preserved admin '${PRESERVED_ADMIN_EMAIL}' not found. Aborting.`);
    process.exit(1);
  }

  if (admin.role !== 'SUPER_ADMIN') {
    console.error(`❌ FATAL: '${PRESERVED_ADMIN_EMAIL}' has role '${admin.role}', not SUPER_ADMIN. Aborting.`);
    process.exit(1);
  }

  log(`\n✅ Admin to preserve: ${admin.email} [${admin.role}] (id: ${admin.id})`);
  const ADMIN_ID = admin.id;

  // 2. Collect all non-admin user IDs to delete
  const usersToDelete = await prisma.user.findMany({
    where: { id: { not: ADMIN_ID } },
    select: { id: true, email: true, role: true },
  });

  log(`\n📋 Users targeted for deletion (${usersToDelete.length}):`);
  for (const u of usersToDelete) {
    log(`   [${u.role}] ${u.email}`);
  }

  const deleteUserIds = usersToDelete.map(u => u.id);

  // 3. Collect storage paths before deleting
  const storagePaths = await prisma.registrationEvidence.findMany({
    select: { storagePath: true },
  });

  // ─── PHASE 1: Database cleanup (transactional where possible) ────────────
  section('PHASE 1: Database Cleanup');

  // Deletions that don't reference the admin and have no Restrict FK blockers
  // are done in a single large transaction.
  await prisma.$transaction(async (tx) => {
    // 3a. Notification logs (standalone, safe)
    const nlDel = await tx.notificationLog.deleteMany({});
    log(`  Deleted ${nlDel.count} NotificationLog records`);

    // 3b. Announcements (standalone)
    const annDel = await tx.announcement.deleteMany({});
    log(`  Deleted ${annDel.count} Announcement records`);

    // 3c. AuditLogs — delete ALL (admin has 0, per dry-run, so nothing lost)
    const alDel = await tx.auditLog.deleteMany({});
    log(`  Deleted ${alDel.count} AuditLog records`);

    // 3d. Tickets (FK → Registration, onDelete default = Restrict in Postgres)
    const tickDel = await tx.ticket.deleteMany({});
    log(`  Deleted ${tickDel.count} Ticket records`);

    // 3e. Payments (FK → Invoice)
    const payDel = await tx.payment.deleteMany({});
    log(`  Deleted ${payDel.count} Payment records`);

    // 3f. CollectiveInvoiceItems (onDelete: Restrict — must go before CollectiveInvoice)
    const ciItemDel = await tx.collectiveInvoiceItem.deleteMany({});
    log(`  Deleted ${ciItemDel.count} CollectiveInvoiceItem records`);

    // 3g. CollectiveInvoices
    const ciDel = await tx.collectiveInvoice.deleteMany({});
    log(`  Deleted ${ciDel.count} CollectiveInvoice records`);

    // 3h. Invoices (FK → Registration)
    const invDel = await tx.invoice.deleteMany({});
    log(`  Deleted ${invDel.count} Invoice records`);

    // 3i. RegistrationEvidence (FK → Registration onDelete: Cascade, but we delete
    //     explicitly first for clarity; also clears uploaded/reviewed-by references)
    const evDel = await tx.registrationEvidence.deleteMany({});
    log(`  Deleted ${evDel.count} RegistrationEvidence records`);

    // 3j. Registrations — null out paymentConfirmedById for admin safety
    //     (dry-run showed 0, but do this defensively)
    await tx.registration.updateMany({
      where: { paymentConfirmedById: ADMIN_ID },
      data: { paymentConfirmedById: null },
    });
    const regDel = await tx.registration.deleteMany({});
    log(`  Deleted ${regDel.count} Registration records`);

    // 3k. TeamMembers
    const tmDel = await tx.teamMember.deleteMany({});
    log(`  Deleted ${tmDel.count} TeamMember records`);

    // 3l. Teams
    const teamDel = await tx.team.deleteMany({});
    log(`  Deleted ${teamDel.count} Team records`);

    // 3m. CampusPayments
    const cpDel = await tx.campusPayment.deleteMany({});
    log(`  Deleted ${cpDel.count} CampusPayment records`);

    // 3n. AmbassadorRequests
    const arDel = await tx.ambassadorRequest.deleteMany({});
    log(`  Deleted ${arDel.count} AmbassadorRequest records`);

    // 3o. Ambassadors
    const ambDel = await tx.ambassador.deleteMany({});
    log(`  Deleted ${ambDel.count} Ambassador records`);

    // 3p. FDOs (non-admin only — but there's only 1 FDO and it's not the admin)
    const fdoDel = await tx.fDO.deleteMany({
      where: { userId: { not: ADMIN_ID } },
    });
    log(`  Deleted ${fdoDel.count} FDO records`);

    // 3q. Participants (non-admin only; admin has no Participant row per schema check)
    //     First detach admin participant if any (safety)
    const adminParticipant = await tx.participant.findFirst({
      where: { userId: ADMIN_ID },
    });
    let preservedParticipantId: string | null = null;
    if (adminParticipant) {
      preservedParticipantId = adminParticipant.id;
      log(`  ⚠️  Admin has a Participant row (id: ${adminParticipant.id}) — preserving it`);
    }

    const pDel = await tx.participant.deleteMany({
      where: {
        ...(preservedParticipantId ? { id: { not: preservedParticipantId } } : {}),
      },
    });
    log(`  Deleted ${pDel.count} Participant records`);

    // 3r. Non-admin Users
    const uDel = await tx.user.deleteMany({
      where: { id: { not: ADMIN_ID } },
    });
    log(`  Deleted ${uDel.count} User records (non-admin)`);

    // 3s. Universities (all are now unlinked)
    const uniDel = await tx.university.deleteMany({});
    log(`  Deleted ${uniDel.count} University records`);

    // 3t. Events (all are now unlinked)
    const evtDel = await tx.event.deleteMany({});
    log(`  Deleted ${evtDel.count} Event records`);

    // Note: DiscountTier is configuration data. Leave it unless explicitly requested.
    log(`  DiscountTier: left untouched (configuration data)`);
  }, {
    // Give enough timeout for all these deletes
    timeout: 60000,
  });

  log('\n✅ Database transaction committed successfully.');

  // ─── PHASE 2: Verify admin still exists ──────────────────────────────────
  section('PHASE 2: Post-Cleanup Admin Verification');

  const adminCheck = await prisma.user.findUnique({
    where: { email: PRESERVED_ADMIN_EMAIL },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!adminCheck) {
    console.error('❌ CRITICAL: Admin was deleted! Investigate immediately.');
    process.exit(1);
  }

  log(`  ✅ Admin still exists: ${adminCheck.email} [${adminCheck.role}]`);
  if (adminCheck.id !== ADMIN_ID) {
    console.error('❌ CRITICAL: Admin ID changed unexpectedly!');
    process.exit(1);
  }
  log(`  ✅ Admin ID unchanged: ${adminCheck.id}`);

  // ─── PHASE 3: Post-cleanup record count verification ─────────────────────
  section('PHASE 3: Post-Cleanup Record Counts');

  const afterCounts = {
    User:                await prisma.user.count(),
    Participant:         await prisma.participant.count(),
    Ambassador:          await prisma.ambassador.count(),
    FDO:                 await prisma.fDO.count(),
    AmbassadorRequest:   await prisma.ambassadorRequest.count(),
    University:          await prisma.university.count(),
    Event:               await prisma.event.count(),
    Team:                await prisma.team.count(),
    TeamMember:          await prisma.teamMember.count(),
    Registration:        await prisma.registration.count(),
    RegistrationEvidence:await prisma.registrationEvidence.count(),
    Invoice:             await prisma.invoice.count(),
    CollectiveInvoice:   await prisma.collectiveInvoice.count(),
    CollectiveInvoiceItem: await prisma.collectiveInvoiceItem.count(),
    Payment:             await prisma.payment.count(),
    CampusPayment:       await prisma.campusPayment.count(),
    Ticket:              await prisma.ticket.count(),
    AuditLog:            await prisma.auditLog.count(),
    NotificationLog:     await prisma.notificationLog.count(),
    Announcement:        await prisma.announcement.count(),
    DiscountTier:        await prisma.discountTier.count(),
  };

  for (const [table, count] of Object.entries(afterCounts)) {
    const ok = (table === 'User' && count === 1) 
      ? '✅' 
      : (table === 'DiscountTier' && count > 0) 
      ? '✅' 
      : count === 0 
      ? '✅' 
      : '⚠️ ';
    log(`  ${ok} ${table.padEnd(24)} ${count}`);
  }

  // ─── PHASE 4: Supabase Auth cleanup ─────────────────────────────────────
  section('PHASE 4: Supabase Auth User Cleanup');

  let supabase: ReturnType<typeof createSupabaseAdmin> | null = null;
  try {
    supabase = createSupabaseAdmin();
  } catch (err: any) {
    log(`  ⚠️  Supabase admin client could not be created: ${err.message}`);
    log('  Supabase Auth cleanup skipped. Delete non-admin Auth users manually.');
  }

  if (supabase) {
    // List all Supabase Auth users
    const { data: authList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listErr) {
      log(`  ⚠️  Could not list Supabase Auth users: ${listErr.message}`);
    } else {
      log(`  Found ${authList.users.length} Supabase Auth user(s) total`);

      // Find admin's Supabase Auth identity by email
      const adminAuthUser = authList.users.find(u => u.email === PRESERVED_ADMIN_EMAIL);
      if (!adminAuthUser) {
        log(`  ⚠️  Admin Auth identity not found by email. Will skip all deletions to avoid accidental removal.`);
      } else {
        log(`  ✅ Admin Auth identity found: ${adminAuthUser.email} (id: ${adminAuthUser.id})`);

        // Delete all non-admin Auth users
        const authUsersToDelete = authList.users.filter(u => u.id !== adminAuthUser.id);
        log(`  Deleting ${authUsersToDelete.length} non-admin Auth user(s)...`);

        const authDeleteResults: { email: string; success: boolean; error?: string }[] = [];

        for (const authUser of authUsersToDelete) {
          const { error: delErr } = await supabase.auth.admin.deleteUser(authUser.id);
          authDeleteResults.push({
            email: authUser.email ?? authUser.id,
            success: !delErr,
            error: delErr?.message,
          });
          if (delErr) {
            log(`  ⚠️  Failed to delete Auth user ${authUser.email}: ${delErr.message}`);
          } else {
            log(`  🗑️  Deleted Auth user: ${authUser.email}`);
          }
        }

        const succeeded = authDeleteResults.filter(r => r.success).length;
        const failed = authDeleteResults.filter(r => !r.success).length;
        log(`\n  Auth deletion summary: ${succeeded} succeeded, ${failed} failed`);

        // Verify admin still has Auth identity
        const { data: adminVerify } = await supabase.auth.admin.getUserById(adminAuthUser.id);
        if (adminVerify?.user) {
          log(`  ✅ Admin Auth identity still present: ${adminVerify.user.email}`);
        } else {
          log(`  ❌ Admin Auth identity appears missing after cleanup — investigate!`);
        }
      }
    }
  }

  // ─── PHASE 5: Supabase Storage cleanup ───────────────────────────────────
  section('PHASE 5: Supabase Storage Cleanup');

  if (!supabase) {
    log('  Supabase client unavailable. Storage cleanup skipped.');
  } else {
    log(`  Storage objects to delete (${storagePaths.length} from RegistrationEvidence):`);

    if (storagePaths.length === 0) {
      log('  No storage objects found.');
    } else {
      // Determine bucket names from paths
      // Known path patterns:
      //   "public-registration/<event-id>/<file>"   → bucket: "registrations" or "private"
      //   "ambassador-registration/<participant-id>/<file>" → bucket: "registrations" or "private"
      //   "<uuid>/<uuid>-student-card.jpg"           → unknown bucket — skip and report
      //
      // We'll attempt deletion from the "private" bucket (consistent with private upload logic).
      // If that fails, report the path for manual cleanup.

      const STORAGE_BUCKET = 'private'; // adjust if the app uses a different bucket name

      // Check available buckets
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketNames = buckets?.map(b => b.name) ?? [];
      log(`  Available Storage buckets: ${bucketNames.join(', ')}`);

      const pathsToDelete = storagePaths.map(e => e.storagePath);
      
      if (bucketNames.includes(STORAGE_BUCKET)) {
        const { data: delData, error: storageErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(pathsToDelete);

        if (storageErr) {
          log(`  ⚠️  Bulk storage delete error: ${storageErr.message}`);
          log(`  Paths that may need manual cleanup:`);
          for (const p of pathsToDelete) log(`    ${p}`);
        } else {
          log(`  ✅ Storage delete completed. Deleted ${delData?.length ?? 0} object(s).`);
          if (delData && delData.length < pathsToDelete.length) {
            log(`  ⚠️  ${pathsToDelete.length - delData.length} object(s) were not found (may already be removed).`);
          }
        }
      } else {
        log(`  ⚠️  Bucket '${STORAGE_BUCKET}' not found. Available: [${bucketNames.join(', ')}]`);
        log('  Storage objects left for manual review:');
        for (const p of pathsToDelete) log(`    ${p}`);
      }
    }
  }

  // ─── FINAL SUMMARY ───────────────────────────────────────────────────────
  section('CLEANUP COMPLETE — FINAL SUMMARY');
  log(`  ✅ Preserved admin: ${PRESERVED_ADMIN_EMAIL} [SUPER_ADMIN] id=${ADMIN_ID}`);
  log(`  ✅ Deleted ${usersToDelete.length} non-admin application User records`);
  log(`  ✅ Database FK-safe delete transaction committed`);
  log(`  ✅ No schema, migrations, or source code modified`);
  log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Cleanup script failed:', e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
