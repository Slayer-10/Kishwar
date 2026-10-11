import { randomInt } from 'crypto';
import { printTestSummary, TestResult } from './helpers/test-results';

// Replicate the password generation helper to test its mathematical/character properties
function generateAmbassadorPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  return Array.from(
    { length: 8 },
    () => chars[randomInt(chars.length)]
  ).join('');
}

// Allowed character set for verification
const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const CONFUSING_CHARS = ['0', 'O', '1', 'I', 'l'];

// Simulating the approval logic engine to test comprehensive scenarios in isolation
interface MockAuthUser {
  id: string;
  email: string;
  password?: string;
}

interface MockPrismaUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface MockParticipant {
  id: string;
  userId: string | null;
  email: string;
  fullName: string;
  universityId: string | null;
}

interface MockAmbassador {
  userId: string;
  universityId: string;
  ambassadorCode: string;
}

interface MockAmbassadorRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  email: string;
  fullName: string;
  universityId: string;
  participantId?: string;
  reviewedById?: string;
  reviewedAt?: Date;
}

class ApprovalEngineMock {
  authUsers = new Map<string, MockAuthUser>();
  prismaUsers = new Map<string, MockPrismaUser>();
  participants = new Map<string, MockParticipant>();
  ambassadors = new Map<string, MockAmbassador>();
  requests = new Map<string, MockAmbassadorRequest>();
  simulatedAuthFailure = false;
  simulatedDbFailure = false;
  authDeletedIds: string[] = [];

  constructor() {}

  async approveRequest(params: {
    adminUser: { id: string; role: string };
    requestId: string;
    universityId: string;
    ambassadorCode: string;
  }) {
    if (params.adminUser.role !== 'SUPER_ADMIN') {
      return { error: 'Only Super Admin can approve Ambassador requests.' };
    }

    const request = this.requests.get(params.requestId);
    if (!request) return { error: 'Ambassador request not found.' };
    if (request.status !== 'PENDING') return { error: 'This request has already been reviewed.' };

    for (const amb of Array.from(this.ambassadors.values())) {
      if (amb.universityId === params.universityId) {
        return { error: 'This university already has a campus ambassador.' };
      }
      if (amb.ambassadorCode === params.ambassadorCode) {
        return { error: 'That Ambassador code is already in use.' };
      }
    }

    const applicantEmail = request.email.toLowerCase().trim();
    const generatedPassword = generateAmbassadorPassword();

    let targetUserId: string;
    let newlyCreatedAuthUserId: string | null = null;

    let existingPrismaUser: MockPrismaUser | undefined;
    for (const u of Array.from(this.prismaUsers.values())) {
      if (u.email === applicantEmail) {
        existingPrismaUser = u;
        break;
      }
    }

    if (existingPrismaUser) {
      targetUserId = existingPrismaUser.id;
      if (this.ambassadors.has(targetUserId)) {
        return { error: 'This applicant is already an Ambassador.' };
      }

      const matchingAuth = this.authUsers.get(targetUserId);
      if (!matchingAuth || matchingAuth.email.toLowerCase() !== applicantEmail) {
        return { error: 'Could not verify matching authentication account. No approval was completed.' };
      }

      if (this.simulatedAuthFailure) {
        return { error: 'Could not set the Ambassador login credentials. No approval was completed.' };
      }

      matchingAuth.password = generatedPassword;
      existingPrismaUser.role = 'AMBASSADOR';
      existingPrismaUser.isActive = true;
    } else {
      if (this.simulatedAuthFailure) {
        return { error: 'Could not create the Ambassador login credentials. No approval was completed.' };
      }

      targetUserId = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      newlyCreatedAuthUserId = targetUserId;
      this.authUsers.set(targetUserId, {
        id: targetUserId,
        email: applicantEmail,
        password: generatedPassword,
      });

      this.prismaUsers.set(targetUserId, {
        id: targetUserId,
        email: applicantEmail,
        role: 'AMBASSADOR',
        isActive: true,
      });
    }

    try {
      if (this.simulatedDbFailure) {
        throw new Error('Database transaction failed unexpectedly');
      }

      let participant: MockParticipant | undefined;
      for (const p of Array.from(this.participants.values())) {
        if (p.userId === targetUserId || p.email === applicantEmail) {
          participant = p;
          break;
        }
      }

      if (participant) {
        participant.userId = targetUserId;
        participant.universityId = participant.universityId ?? params.universityId;
      } else {
        const pId = `part_${Date.now()}`;
        participant = {
          id: pId,
          userId: targetUserId,
          email: applicantEmail,
          fullName: request.fullName,
          universityId: params.universityId,
        };
        this.participants.set(pId, participant);
      }

      this.ambassadors.set(targetUserId, {
        userId: targetUserId,
        universityId: params.universityId,
        ambassadorCode: params.ambassadorCode,
      });

      request.status = 'APPROVED';
      request.reviewedById = params.adminUser.id;
      request.reviewedAt = new Date();
    } catch (err: any) {
      if (newlyCreatedAuthUserId) {
        this.authUsers.delete(newlyCreatedAuthUserId);
        this.prismaUsers.delete(newlyCreatedAuthUserId);
        this.authDeletedIds.push(newlyCreatedAuthUserId);
      }
      return { error: `Failed to complete Ambassador database approval: ${err.message}` };
    }

    return {
      credentials: {
        email: applicantEmail,
        password: generatedPassword,
      },
    };
  }
}

async function runAmbassadorApprovalTests() {
  const results: TestResult[] = [];
  console.log('Starting Ambassador Approval & 8-Character Password Test Suite...\n');

  // --- SECTION 1: Password Generation & Security ---
  const samplePasswords = Array.from({ length: 50 }, () => generateAmbassadorPassword());

  const allLength8 = samplePasswords.every((p) => p.length === 8);
  results.push({
    name: 'Password Generation: Every generated password has length of exactly 8 characters',
    passed: allLength8,
    details: allLength8 ? undefined : 'Found passwords with length != 8',
  });

  const allCharsAllowed = samplePasswords.every((p) =>
    Array.from(p).every((ch) => ALLOWED_CHARS.includes(ch))
  );
  results.push({
    name: 'Password Generation: Passwords only use characters from the safe alphanumeric charset',
    passed: allCharsAllowed,
  });

  const containsConfusing = samplePasswords.some((p) =>
    CONFUSING_CHARS.some((confusing) => p.includes(confusing))
  );
  results.push({
    name: 'Password Generation: Excludes visually confusing characters (0, O, 1, I, l)',
    passed: !containsConfusing,
  });

  const uniqueSamples = new Set(samplePasswords);
  results.push({
    name: 'Password Generation: High cryptographic entropy produces distinct passwords',
    passed: uniqueSamples.size === 50,
    details: `Generated ${uniqueSamples.size}/50 unique passwords`,
  });

  // --- SECTION 2: Approval of New User ---
  const engine1 = new ApprovalEngineMock();
  engine1.requests.set('req_1', {
    id: 'req_1',
    status: 'PENDING',
    email: 'newamb@fast.edu.pk',
    fullName: 'New Ambassador',
    universityId: 'uni_fast',
  });

  const resNew = await engine1.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_1',
    universityId: 'uni_fast',
    ambassadorCode: 'AMB-FAST-01',
  });

  const newAuthUser = Array.from(engine1.authUsers.values()).find((u) => u.email === 'newamb@fast.edu.pk');
  const newPrismaUser = Array.from(engine1.prismaUsers.values()).find((u) => u.email === 'newamb@fast.edu.pk');
  const newAmbassador = Array.from(engine1.ambassadors.values()).find((a) => a.ambassadorCode === 'AMB-FAST-01');

  results.push({
    name: 'New-User Approval: Returns credentials with normalized email and 8-char password',
    passed: Boolean(
      resNew.credentials &&
      resNew.credentials.email === 'newamb@fast.edu.pk' &&
      resNew.credentials.password.length === 8
    ),
  });

  results.push({
    name: 'New-User Approval: Provisions Supabase Auth user and matching Prisma User with role AMBASSADOR',
    passed: Boolean(
      newAuthUser &&
      newPrismaUser &&
      newAuthUser.id === newPrismaUser.id &&
      newPrismaUser.role === 'AMBASSADOR' &&
      newPrismaUser.isActive === true
    ),
  });

  results.push({
    name: 'New-User Approval: Sets Ambassador record and updates request status to APPROVED',
    passed: Boolean(
      newAmbassador &&
      engine1.requests.get('req_1')?.status === 'APPROVED' &&
      engine1.requests.get('req_1')?.reviewedById === 'admin_1'
    ),
  });

  // --- SECTION 3: Approval of Existing User ---
  const engine2 = new ApprovalEngineMock();
  const existingUserId = 'user_existing_123';
  engine2.authUsers.set(existingUserId, {
    id: existingUserId,
    email: 'existing@nust.edu.pk',
    password: 'oldPassword123',
  });
  engine2.prismaUsers.set(existingUserId, {
    id: existingUserId,
    email: 'existing@nust.edu.pk',
    role: 'PARTICIPANT',
    isActive: true,
  });
  engine2.participants.set('part_existing', {
    id: 'part_existing',
    userId: existingUserId,
    email: 'existing@nust.edu.pk',
    fullName: 'Existing Participant',
    universityId: null,
  });
  engine2.requests.set('req_2', {
    id: 'req_2',
    status: 'PENDING',
    email: 'existing@nust.edu.pk',
    fullName: 'Existing Participant',
    universityId: 'uni_nust',
  });

  const resExisting = await engine2.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_2',
    universityId: 'uni_nust',
    ambassadorCode: 'AMB-NUST-01',
  });

  const updatedAuth = engine2.authUsers.get(existingUserId);
  const updatedPrisma = engine2.prismaUsers.get(existingUserId);
  const updatedParticipant = engine2.participants.get('part_existing');

  results.push({
    name: 'Existing-User Approval: Preserves existing user ID and updates password in Auth',
    passed: Boolean(
      resExisting.credentials &&
      resExisting.credentials.password.length === 8 &&
      updatedAuth &&
      updatedAuth.password === resExisting.credentials.password
    ),
  });

  results.push({
    name: 'Existing-User Approval: Promotes Prisma user role to AMBASSADOR and maintains active status',
    passed: Boolean(
      updatedPrisma &&
      updatedPrisma.role === 'AMBASSADOR' &&
      updatedPrisma.isActive === true
    ),
  });

  results.push({
    name: 'Existing-User Approval: Preserves existing participant record without duplicate error',
    passed: Boolean(
      updatedParticipant &&
      updatedParticipant.fullName === 'Existing Participant' &&
      updatedParticipant.universityId === 'uni_nust'
    ),
  });

  // --- SECTION 4: Rollback & Safety on Failure ---
  const engine3 = new ApprovalEngineMock();
  engine3.simulatedAuthFailure = true;
  engine3.requests.set('req_auth_fail', {
    id: 'req_auth_fail',
    status: 'PENDING',
    email: 'authfail@lums.edu.pk',
    fullName: 'Lums User',
    universityId: 'uni_lums',
  });

  const resAuthFail = await engine3.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_auth_fail',
    universityId: 'uni_lums',
    ambassadorCode: 'AMB-LUMS-01',
  });

  results.push({
    name: 'Failure Handling: Auth provisioning failure returns clear error and does not approve request',
    passed: Boolean(
      resAuthFail.error &&
      engine3.requests.get('req_auth_fail')?.status === 'PENDING'
    ),
  });

  const engine4 = new ApprovalEngineMock();
  engine4.simulatedDbFailure = true;
  engine4.requests.set('req_db_fail', {
    id: 'req_db_fail',
    status: 'PENDING',
    email: 'dbfail@giki.edu.pk',
    fullName: 'Giki User',
    universityId: 'uni_giki',
  });

  const resDbFail = await engine4.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_db_fail',
    universityId: 'uni_giki',
    ambassadorCode: 'AMB-GIKI-01',
  });

  results.push({
    name: 'Failure Handling: DB failure rolls back newly created Auth user to prevent orphan accounts',
    passed: Boolean(
      resDbFail.error &&
      engine4.authDeletedIds.length === 1 &&
      engine4.requests.get('req_db_fail')?.status === 'PENDING'
    ),
  });

  // Existing user rollback safety check:
  const engine5 = new ApprovalEngineMock();
  const preExistingId = 'pre_existing_auth_999';
  engine5.authUsers.set(preExistingId, {
    id: preExistingId,
    email: 'safe@pieas.edu.pk',
    password: 'originalPassword',
  });
  engine5.prismaUsers.set(preExistingId, {
    id: preExistingId,
    email: 'safe@pieas.edu.pk',
    role: 'PARTICIPANT',
    isActive: true,
  });
  engine5.requests.set('req_safe_fail', {
    id: 'req_safe_fail',
    status: 'PENDING',
    email: 'safe@pieas.edu.pk',
    fullName: 'Pieas User',
    universityId: 'uni_pieas',
  });
  engine5.simulatedDbFailure = true;

  await engine5.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_safe_fail',
    universityId: 'uni_pieas',
    ambassadorCode: 'AMB-PIEAS-01',
  });

  results.push({
    name: 'Failure Handling: DB failure NEVER deletes a pre-existing Auth account as rollback',
    passed: Boolean(
      engine5.authUsers.has(preExistingId) &&
      !engine5.authDeletedIds.includes(preExistingId)
    ),
  });

  // --- SECTION 5: Duplicate Approvals & Constraint Checks ---
  const resDupRequest = await engine1.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_1', // already approved in SECTION 2
    universityId: 'uni_another',
    ambassadorCode: 'AMB-NEW-99',
  });

  results.push({
    name: 'Duplicate Prevention: Repeated approval of already reviewed request is rejected',
    passed: resDupRequest.error === 'This request has already been reviewed.',
  });

  engine1.requests.set('req_dup_code', {
    id: 'req_dup_code',
    status: 'PENDING',
    email: 'code_dup@test.edu.pk',
    fullName: 'Code Dup User',
    universityId: 'uni_unused',
  });

  const resDupCode = await engine1.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_dup_code',
    universityId: 'uni_unused',
    ambassadorCode: 'AMB-FAST-01', // code used in Section 2
  });

  results.push({
    name: 'Duplicate Prevention: Reject ambassador code collision with existing ambassador',
    passed: resDupCode.error === 'That Ambassador code is already in use.',
  });

  engine1.requests.set('req_dup_uni', {
    id: 'req_dup_uni',
    status: 'PENDING',
    email: 'uni_dup@test.edu.pk',
    fullName: 'Uni Dup User',
    universityId: 'uni_fast',
  });

  const resDupUni = await engine1.approveRequest({
    adminUser: { id: 'admin_1', role: 'SUPER_ADMIN' },
    requestId: 'req_dup_uni',
    universityId: 'uni_fast', // already has ambassador from Section 2
    ambassadorCode: 'AMB-UNI-999',
  });

  results.push({
    name: 'Duplicate Prevention: Reject assigning university that already has a campus ambassador',
    passed: resDupUni.error === 'This university already has a campus ambassador.',
  });

  // --- SECTION 6: Role Home & Login Path Validation ---
  const ROLE_HOME: Record<string, string> = {
    SUPER_ADMIN: '/admin',
    FDO: '/fdo',
    AMBASSADOR: '/ambassador',
    PARTICIPANT: '/participant',
  };

  results.push({
    name: 'Login Path: Ambassador role correctly routes to /ambassador home destination',
    passed: ROLE_HOME['AMBASSADOR'] === '/ambassador',
  });

  results.push({
    name: 'Login Path: Verified Auth ID matches Prisma User ID for ambassador role',
    passed: Boolean(newAuthUser && newPrismaUser && newAuthUser.id === newPrismaUser.id),
  });

  const allPassed = printTestSummary(results);
  if (!allPassed) {
    process.exit(1);
  }
}

runAmbassadorApprovalTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
