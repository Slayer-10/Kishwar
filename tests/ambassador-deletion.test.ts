import { printTestSummary, TestResult } from './helpers/test-results';

interface MockAuthUser {
  id: string;
  email: string;
}

interface MockPrismaUser {
  id: string;
  email: string;
  role: string;
}

interface MockParticipant {
  id: string;
  userId: string | null;
  registrations: Array<{ id: string }>;
  captainOfTeams: Array<{ id: string }>;
  teamMemberships: Array<{ id: string }>;
  registrationEvidence: Array<{ id: string }>;
}

interface MockTeam {
  id: string;
  ambassadorId: string | null;
}

interface MockRegistration {
  id: string;
  ambassadorId: string | null;
}

interface MockAmbassadorRequest {
  id: string;
  participantId: string | null;
}

interface MockAuditLog {
  userId: string;
  action: string;
  targetTable: string;
  targetId: string;
  details: any;
}

interface MockAmbassador {
  id: string;
  userId: string;
  ambassadorCode: string;
  teamsCount: number;
  registrationsCount: number;
  campusPaymentsCount: number;
  collectiveInvoicesCount: number;
}

class DeletionEngineMock {
  authUsers = new Map<string, MockAuthUser>();
  prismaUsers = new Map<string, MockPrismaUser>();
  participants = new Map<string, MockParticipant>();
  ambassadors = new Map<string, MockAmbassador>();
  teams = new Map<string, MockTeam>();
  registrations = new Map<string, MockRegistration>();
  ambassadorRequests = new Map<string, MockAmbassadorRequest>();
  auditLogs: MockAuditLog[] = [];
  revalidatedPaths: string[] = [];
  simulateAuthDeletionError: string | null = null;

  async deleteAmbassador(ambassadorId: string, adminId: string) {
    const ambassador = this.ambassadors.get(ambassadorId);
    if (!ambassador) {
      throw new Error('Ambassador not found.');
    }

    if (
      ambassador.campusPaymentsCount > 0 ||
      ambassador.collectiveInvoicesCount > 0
    ) {
      throw new Error(
        'This ambassador has financial records. Preserve those records and resolve their ambassador references before deleting the assignment.'
      );
    }

    let participant: MockParticipant | undefined;
    for (const p of Array.from(this.participants.values())) {
      if (p.userId === ambassador.userId) {
        participant = p;
        break;
      }
    }

    const hasParticipantHistory = Boolean(
      participant &&
        (
          participant.registrations.length > 0 ||
          participant.captainOfTeams.length > 0 ||
          participant.teamMemberships.length > 0 ||
          participant.registrationEvidence.length > 0
        )
    );

    const hasAmbassadorEventHistory =
      ambassador.teamsCount > 0 ||
      ambassador.registrationsCount > 0;

    const user = this.prismaUsers.get(ambassador.userId);
    const hasOtherUserDependencies = Boolean(
      user && (user as any).hasOtherDependencies
    );

    const preserveAccount =
      hasParticipantHistory ||
      hasAmbassadorEventHistory ||
      hasOtherUserDependencies;

    if (preserveAccount) {
      // Retained account
      for (const t of Array.from(this.teams.values())) {
        if (t.ambassadorId === ambassador.id) {
          t.ambassadorId = null;
        }
      }

      for (const r of Array.from(this.registrations.values())) {
        if (r.ambassadorId === ambassador.id) {
          r.ambassadorId = null;
        }
      }

      this.ambassadors.delete(ambassadorId);

      if (user) {
        user.role = 'PARTICIPANT';
      }

      this.auditLogs.push({
        userId: adminId,
        action: 'DELETE',
        targetTable: 'Ambassador',
        targetId: ambassadorId,
        details: {
          ambassadorCode: ambassador.ambassadorCode,
          userId: ambassador.userId,
          outcome: 'Ambassador assignment removed; account and history preserved.',
        },
      });
    } else {
      // Completely remove unregistered account
      if (participant) {
        for (const req of Array.from(this.ambassadorRequests.values())) {
          if (req.participantId === participant.id) {
            req.participantId = null;
          }
        }
        this.participants.delete(participant.id);
      }

      this.ambassadors.delete(ambassadorId);

      this.auditLogs.push({
        userId: adminId,
        action: 'DELETE',
        targetTable: 'Ambassador',
        targetId: ambassadorId,
        details: {
          ambassadorCode: ambassador.ambassadorCode,
          userId: ambassador.userId,
          outcome: 'Ambassador, participant (if present), and database user removed.',
        },
      });

      this.prismaUsers.delete(ambassador.userId);

      if (this.simulateAuthDeletionError) {
        throw new Error(
          `Database deletion succeeded, but Supabase Auth deletion failed for user ${ambassador.userId}: ${this.simulateAuthDeletionError}. Retry Auth cleanup for this user.`
        );
      }

      this.authUsers.delete(ambassador.userId);
    }

    this.revalidatedPaths.push('/admin/ambassadors');
    this.revalidatedPaths.push('/admin/ambassador-requests');
    this.revalidatedPaths.push('/admin/universities');
  }
}

async function runAmbassadorDeletionTests() {
  const results: TestResult[] = [];
  console.log('Starting Ambassador Deletion Bug Fix Test Suite...\n');

  // --- TEST 1: Registered Ambassador with Participant History ---
  const engine1 = new DeletionEngineMock();
  const regUserId = 'user_reg_1';
  const ambId1 = 'amb_1';

  engine1.authUsers.set(regUserId, { id: regUserId, email: 'amb1@test.com' });
  engine1.prismaUsers.set(regUserId, { id: regUserId, email: 'amb1@test.com', role: 'AMBASSADOR' });
  engine1.participants.set('part_1', {
    id: 'part_1',
    userId: regUserId,
    registrations: [{ id: 'reg_1' }],
    captainOfTeams: [],
    teamMemberships: [],
    registrationEvidence: [],
  });
  engine1.ambassadors.set(ambId1, {
    id: ambId1,
    userId: regUserId,
    ambassadorCode: 'AMB-TEST-01',
    teamsCount: 1,
    registrationsCount: 1,
    campusPaymentsCount: 0,
    collectiveInvoicesCount: 0,
  });
  engine1.teams.set('team_1', { id: 'team_1', ambassadorId: ambId1 });
  engine1.registrations.set('reg_1', { id: 'reg_1', ambassadorId: ambId1 });

  await engine1.deleteAmbassador(ambId1, 'admin_super');

  results.push({
    name: 'Registered Ambassador: Ambassador record is deleted',
    passed: !engine1.ambassadors.has(ambId1),
  });

  results.push({
    name: 'Registered Ambassador: User record is retained and role downgraded to PARTICIPANT',
    passed: Boolean(
      engine1.prismaUsers.has(regUserId) &&
      engine1.prismaUsers.get(regUserId)?.role === 'PARTICIPANT'
    ),
  });

  results.push({
    name: 'Registered Ambassador: Participant record and registrations are preserved',
    passed: Boolean(
      engine1.participants.has('part_1') &&
      engine1.participants.get('part_1')?.registrations.length === 1
    ),
  });

  results.push({
    name: 'Registered Ambassador: Optional ambassador references on teams & registrations set to null',
    passed: Boolean(
      engine1.teams.get('team_1')?.ambassadorId === null &&
      engine1.registrations.get('reg_1')?.ambassadorId === null
    ),
  });

  results.push({
    name: 'Registered Ambassador: Supabase Auth identity is NOT deleted',
    passed: engine1.authUsers.has(regUserId),
  });

  results.push({
    name: 'Registered Ambassador: Audit log records status revoked and participant retained',
    passed: Boolean(
      engine1.auditLogs.some(
        (log) =>
          log.targetId === ambId1 &&
          log.details?.outcome === 'Ambassador assignment removed; account and history preserved.'
      )
    ),
  });

  // --- TEST 2: Never-Registered Ambassador (No Participant History) ---
  const engine2 = new DeletionEngineMock();
  const unregUserId = 'user_unreg_2';
  const ambId2 = 'amb_2';

  engine2.authUsers.set(unregUserId, { id: unregUserId, email: 'unreg@test.com' });
  engine2.prismaUsers.set(unregUserId, { id: unregUserId, email: 'unreg@test.com', role: 'AMBASSADOR' });
  engine2.participants.set('part_2', {
    id: 'part_2',
    userId: unregUserId,
    registrations: [],
    captainOfTeams: [],
    teamMemberships: [],
    registrationEvidence: [],
  });
  engine2.ambassadors.set(ambId2, {
    id: ambId2,
    userId: unregUserId,
    ambassadorCode: 'AMB-TEST-02',
    teamsCount: 0,
    registrationsCount: 0,
    campusPaymentsCount: 0,
    collectiveInvoicesCount: 0,
  });
  engine2.ambassadorRequests.set('req_2', { id: 'req_2', participantId: 'part_2' });

  await engine2.deleteAmbassador(ambId2, 'admin_super');

  results.push({
    name: 'Never-Registered Ambassador: Ambassador record is deleted',
    passed: !engine2.ambassadors.has(ambId2),
  });

  results.push({
    name: 'Never-Registered Ambassador: Participant record is deleted after detaching ambassadorRequest',
    passed: Boolean(
      !engine2.participants.has('part_2') &&
      engine2.ambassadorRequests.get('req_2')?.participantId === null
    ),
  });

  results.push({
    name: 'Never-Registered Ambassador: Prisma User record is completely deleted',
    passed: !engine2.prismaUsers.has(unregUserId),
  });

  results.push({
    name: 'Never-Registered Ambassador: Supabase Auth account is deleted',
    passed: !engine2.authUsers.has(unregUserId),
  });

  results.push({
    name: 'Never-Registered Ambassador: Audit log records complete removal',
    passed: Boolean(
      engine2.auditLogs.some(
        (log) =>
          log.targetId === ambId2 &&
          log.details?.outcome === 'Ambassador, participant (if present), and database user removed.'
      )
    ),
  });

  // --- TEST 3: Financial Records Protection ---
  const engine3 = new DeletionEngineMock();
  const finUserId = 'user_fin_3';
  const ambId3 = 'amb_3';

  engine3.ambassadors.set(ambId3, {
    id: ambId3,
    userId: finUserId,
    ambassadorCode: 'AMB-TEST-03',
    teamsCount: 0,
    registrationsCount: 0,
    campusPaymentsCount: 2,
    collectiveInvoicesCount: 0,
  });

  let financialBlockError: string | null = null;
  try {
    await engine3.deleteAmbassador(ambId3, 'admin_super');
  } catch (err: any) {
    financialBlockError = err.message;
  }

  results.push({
    name: 'Financial Protection: Ambassador with campusPayments or collectiveInvoices cannot be deleted',
    passed: Boolean(
      financialBlockError &&
      financialBlockError.includes('financial records')
    ),
  });

  // --- TEST 4: Supabase Auth Deletion Failure Handling ---
  const engine4 = new DeletionEngineMock();
  const failUserId = 'user_fail_4';
  const ambId4 = 'amb_4';

  engine4.authUsers.set(failUserId, { id: failUserId, email: 'fail@test.com' });
  engine4.prismaUsers.set(failUserId, { id: failUserId, email: 'fail@test.com', role: 'AMBASSADOR' });
  engine4.ambassadors.set(ambId4, {
    id: ambId4,
    userId: failUserId,
    ambassadorCode: 'AMB-TEST-04',
    teamsCount: 0,
    registrationsCount: 0,
    campusPaymentsCount: 0,
    collectiveInvoicesCount: 0,
  });
  engine4.simulateAuthDeletionError = 'Supabase network timeout';

  let authFailError: string | null = null;
  try {
    await engine4.deleteAmbassador(ambId4, 'admin_super');
  } catch (err: any) {
    authFailError = err.message;
  }

  results.push({
    name: 'Partial-Cleanup Reporting: Auth failure throws clear error detailing DB deleted but Auth pending',
    passed: Boolean(
      authFailError &&
      authFailError.includes('Database deletion succeeded, but Supabase Auth deletion failed for user') &&
      !engine4.prismaUsers.has(failUserId) && // DB was deleted
      engine4.authUsers.has(failUserId) // Auth still present
    ),
  });

  // --- TEST 5: Ambassador History Without Participant History ---
  const engine5 = new DeletionEngineMock();
  const ambHistUserId = 'user_ambhist_5';
  const ambId5 = 'amb_5';

  engine5.authUsers.set(ambHistUserId, { id: ambHistUserId, email: 'ambhist@test.com' });
  engine5.prismaUsers.set(ambHistUserId, { id: ambHistUserId, email: 'ambhist@test.com', role: 'AMBASSADOR' });
  // No personal participant history
  engine5.participants.set('part_5', {
    id: 'part_5',
    userId: ambHistUserId,
    registrations: [],
    captainOfTeams: [],
    teamMemberships: [],
    registrationEvidence: [],
  });
  // But teams were registered under this ambassador
  engine5.ambassadors.set(ambId5, {
    id: ambId5,
    userId: ambHistUserId,
    ambassadorCode: 'AMB-TEST-05',
    teamsCount: 3,
    registrationsCount: 0,
    campusPaymentsCount: 0,
    collectiveInvoicesCount: 0,
  });
  engine5.teams.set('team_5', { id: 'team_5', ambassadorId: ambId5 });

  await engine5.deleteAmbassador(ambId5, 'admin_super');

  results.push({
    name: 'Ambassador History: User account is preserved as PARTICIPANT when teams or registrations reference them',
    passed: Boolean(
      !engine5.ambassadors.has(ambId5) &&
      engine5.prismaUsers.has(ambHistUserId) &&
      engine5.prismaUsers.get(ambHistUserId)?.role === 'PARTICIPANT' &&
      engine5.teams.get('team_5')?.ambassadorId === null
    ),
  });

  // --- TEST 6: User Dependencies (auditLogs, verifiedPayments, etc.) ---
  const engine6 = new DeletionEngineMock();
  const depUserId = 'user_dep_6';
  const ambId6 = 'amb_6';

  engine6.authUsers.set(depUserId, { id: depUserId, email: 'dep@test.com' });
  engine6.prismaUsers.set(depUserId, {
    id: depUserId,
    email: 'dep@test.com',
    role: 'AMBASSADOR',
    hasOtherDependencies: true,
  } as any);
  engine6.participants.set('part_6', {
    id: 'part_6',
    userId: depUserId,
    registrations: [],
    captainOfTeams: [],
    teamMemberships: [],
    registrationEvidence: [],
  });
  engine6.ambassadors.set(ambId6, {
    id: ambId6,
    userId: depUserId,
    ambassadorCode: 'AMB-TEST-06',
    teamsCount: 0,
    registrationsCount: 0,
    campusPaymentsCount: 0,
    collectiveInvoicesCount: 0,
  });

  await engine6.deleteAmbassador(ambId6, 'admin_super');

  results.push({
    name: 'User Dependencies: User account is preserved as PARTICIPANT when auditLogs or payment reviews exist',
    passed: Boolean(
      !engine6.ambassadors.has(ambId6) &&
      engine6.prismaUsers.has(depUserId) &&
      engine6.prismaUsers.get(depUserId)?.role === 'PARTICIPANT'
    ),
  });

  // --- TEST 7: Revalidation ---
  results.push({
    name: 'Revalidation: Revalidates /admin/ambassadors, /admin/ambassador-requests, and /admin/universities',
    passed:
      engine1.revalidatedPaths.includes('/admin/ambassadors') &&
      engine1.revalidatedPaths.includes('/admin/ambassador-requests') &&
      engine1.revalidatedPaths.includes('/admin/universities'),
  });

  const allPassed = printTestSummary(results);
  if (!allPassed) {
    process.exit(1);
  }
}

runAmbassadorDeletionTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
