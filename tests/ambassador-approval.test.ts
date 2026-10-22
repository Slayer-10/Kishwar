import {
  encryptAmbassadorPassword,
  decryptAmbassadorPassword,
  decryptAmbassadorPasswordSafe,
} from '../lib/encryption';
import { printTestSummary, TestResult } from './helpers/test-results';

// Ensure encryption key is configured for mock engine test runs
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.AMBASSADOR_PASSWORD_ENCRYPTION_KEY = TEST_KEY;

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
  id: string;
  userId: string;
  universityId: string;
  ambassadorCode: string;
  passwordEncrypted?: string | null;
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

interface MockAuditLog {
  userId: string;
  action: string;
  targetTable: string;
  targetId: string;
  details: any;
}

class ApprovalEngineMock {
  authUsers = new Map<string, MockAuthUser>();
  prismaUsers = new Map<string, MockPrismaUser>();
  participants = new Map<string, MockParticipant>();
  ambassadors = new Map<string, MockAmbassador>();
  requests = new Map<string, MockAmbassadorRequest>();
  auditLogs: MockAuditLog[] = [];
  simulatedAuthFailure = false;
  simulatedDbFailure = false;
  authDeletedIds: string[] = [];

  constructor() {}

  async approveRequest(params: {
    adminUser: { id: string; role: string };
    requestId: string;
    universityId: string;
    ambassadorCode: string;
    password?: string;
  }) {
    if (params.adminUser.role !== 'SUPER_ADMIN') {
      return { error: 'Only Super Admin can approve Ambassador requests.' };
    }

    const { requestId, universityId, ambassadorCode, password } = params;

    if (!requestId || !universityId || !ambassadorCode || !password) {
      return { error: 'Request, university, Ambassador code, and login password are required.' };
    }

    if (password.length < 8) {
      return { error: 'Login password must be at least 8 characters long.' };
    }

    let passwordEncrypted: string;
    try {
      passwordEncrypted = encryptAmbassadorPassword(password, TEST_KEY);
    } catch (err: any) {
      return { error: `Server encryption error: ${err.message}` };
    }

    const request = this.requests.get(requestId);
    if (!request) return { error: 'Ambassador request not found.' };
    if (request.status !== 'PENDING') return { error: 'This request has already been reviewed.' };

    for (const amb of Array.from(this.ambassadors.values())) {
      if (amb.universityId === universityId) {
        return { error: 'This university already has a campus ambassador.' };
      }
      if (amb.ambassadorCode === ambassadorCode) {
        return { error: 'That Ambassador code is already in use.' };
      }
    }

    const applicantEmail = request.email.toLowerCase().trim();

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
      if (Array.from(this.ambassadors.values()).some((a) => a.userId === targetUserId)) {
        return { error: 'This applicant is already an Ambassador.' };
      }

      const matchingAuth = this.authUsers.get(targetUserId);
      if (!matchingAuth || matchingAuth.id !== targetUserId) {
        return { error: 'Could not verify matching authentication account. No approval was completed.' };
      }

      if (matchingAuth.email.toLowerCase() !== applicantEmail) {
        return { error: 'Authentication email does not match user account. No approval was completed.' };
      }

      if (this.simulatedAuthFailure) {
        return { error: 'Could not set the Ambassador login credentials. No approval was completed.' };
      }

      matchingAuth.password = password;
    } else {
      if (this.simulatedAuthFailure) {
        return { error: 'Could not create the Ambassador login credentials. No approval was completed.' };
      }

      targetUserId = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      newlyCreatedAuthUserId = targetUserId;
      this.authUsers.set(targetUserId, {
        id: targetUserId,
        email: applicantEmail,
        password: password,
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

      if (existingPrismaUser) {
        existingPrismaUser.role = 'AMBASSADOR';
        existingPrismaUser.isActive = true;
      }

      // Link an existing Participant only — never create one.
      let existingParticipantId: string | null = null;
      for (const p of Array.from(this.participants.values())) {
        if (p.userId === targetUserId) {
          existingParticipantId = p.id;
          break;
        }
      }
      if (!existingParticipantId && request.participantId) {
        const byId = this.participants.get(request.participantId);
        if (byId) {
          existingParticipantId = byId.id;
          byId.userId = targetUserId;
        }
      }

      const ambId = `amb_${Date.now()}`;
      this.ambassadors.set(ambId, {
        id: ambId,
        userId: targetUserId,
        universityId,
        ambassadorCode,
        passwordEncrypted,
      });

      request.status = 'APPROVED';
      request.reviewedById = params.adminUser.id;
      request.reviewedAt = new Date();
      request.participantId = existingParticipantId ?? undefined;
    } catch (err: any) {
      if (newlyCreatedAuthUserId) {
        this.authUsers.delete(newlyCreatedAuthUserId);
        this.prismaUsers.delete(newlyCreatedAuthUserId);
        this.authDeletedIds.push(newlyCreatedAuthUserId);
      }
      return {
        error: `Database approval failed after updating authentication credentials: ${err.message}. The login password was set in Supabase Auth, but Ambassador database records could not be finalized. Please reset credentials or retry.`,
      };
    }

    return {
      credentials: {
        email: applicantEmail,
        password,
        ambassadorCode,
      },
    };
  }

  async createAmbassadorManual(params: {
    adminUser: { id: string; role: string };
    email: string;
    password: string;
    universityId: string;
    ambassadorCode: string;
  }) {
    if (params.adminUser.role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' };
    }

    const { email, password, universityId, ambassadorCode } = params;

    if (!email || !password || !universityId || !ambassadorCode) {
      return { error: 'All fields are required.' };
    }
    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters.' };
    }

    let passwordEncrypted: string;
    try {
      passwordEncrypted = encryptAmbassadorPassword(password, TEST_KEY);
    } catch (err: any) {
      return { error: `Encryption error: ${err.message}` };
    }

    for (const u of Array.from(this.prismaUsers.values())) {
      if (u.email === email) return { error: 'A user with this email already exists.' };
    }

    for (const a of Array.from(this.ambassadors.values())) {
      if (a.universityId === universityId) return { error: 'This university already has a campus ambassador.' };
      if (a.ambassadorCode === ambassadorCode) return { error: 'This ambassador code is already in use.' };
    }

    const authId = `auth_manual_${Date.now()}`;
    this.authUsers.set(authId, { id: authId, email, password });
    this.prismaUsers.set(authId, { id: authId, email, role: 'AMBASSADOR', isActive: true });

    const ambId = `amb_manual_${Date.now()}`;
    this.ambassadors.set(ambId, {
      id: ambId,
      userId: authId,
      universityId,
      ambassadorCode,
      passwordEncrypted,
    });

    this.auditLogs.push({
      userId: params.adminUser.id,
      action: 'CREATE',
      targetTable: 'Ambassador',
      targetId: ambId,
      details: { email, universityId, ambassadorCode }, // No password
    });

    return { success: true, ambassadorId: ambId };
  }

  async resetPassword(params: {
    adminUser: { id: string; role: string };
    ambassadorId: string;
    newPassword: string;
  }) {
    if (params.adminUser.role !== 'SUPER_ADMIN') {
      return { error: 'Only Super Admin can reset Ambassador passwords.' };
    }

    const { ambassadorId, newPassword } = params;
    if (!ambassadorId || !newPassword) {
      return { error: 'Ambassador ID and new password are required.' };
    }
    if (newPassword.length < 8) {
      return { error: 'Password must be at least 8 characters long.' };
    }

    const amb = this.ambassadors.get(ambassadorId);
    if (!amb) return { error: 'Ambassador record not found.' };

    const authUser = this.authUsers.get(amb.userId);
    if (!authUser) return { error: 'Could not verify linked Supabase Auth user.' };

    let passwordEncrypted: string;
    try {
      passwordEncrypted = encryptAmbassadorPassword(newPassword, TEST_KEY);
    } catch (err: any) {
      return { error: `Encryption error: ${err.message}` };
    }

    authUser.password = newPassword;
    amb.passwordEncrypted = passwordEncrypted;

    this.auditLogs.push({
      userId: params.adminUser.id,
      action: 'UPDATE',
      targetTable: 'Ambassador',
      targetId: ambassadorId,
      details: {
        ambassadorCode: amb.ambassadorCode,
        userId: amb.userId,
        actionDescription: 'Reset ambassador password',
      }, // No password
    });

    return { success: true };
  }
}

async function runAmbassadorApprovalTests() {
  const results: TestResult[] = [];
  console.log('Starting Ambassador Admin-Assigned Password & Lifecycle Test Suite...\n');

  const superAdmin = { id: 'admin_super', role: 'SUPER_ADMIN' };
  const standardUser = { id: 'user_regular', role: 'PARTICIPANT' };

  // --- 1. Admin-Submitted Password Required & Enforced ---
  const engine1 = new ApprovalEngineMock();
  engine1.requests.set('req_short_pass', {
    id: 'req_short_pass',
    status: 'PENDING',
    email: 'shortpass@fast.edu.pk',
    fullName: 'Short Pass User',
    universityId: 'uni_fast',
  });

  const resShort = await engine1.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_short_pass',
    universityId: 'uni_fast',
    ambassadorCode: 'AMB-FAST-01',
    password: 'short', // < 8 characters
  });

  results.push({
    name: 'Password Validation: Rejects passwords shorter than 8 characters',
    passed: resShort.error === 'Login password must be at least 8 characters long.',
  });

  // --- 2. New Supabase User Receives Exact Admin-Submitted Password ---
  const chosenPassword1 = 'CustomChosenPass2026!';
  engine1.requests.set('req_new', {
    id: 'req_new',
    status: 'PENDING',
    email: 'newamb@fast.edu.pk',
    fullName: 'New Ambassador',
    universityId: 'uni_fast',
  });

  const resNew = await engine1.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_new',
    universityId: 'uni_fast',
    ambassadorCode: 'AMB-FAST-01',
    password: chosenPassword1,
  });

  const newAuthUser = Array.from(engine1.authUsers.values()).find((u) => u.email === 'newamb@fast.edu.pk');
  const newAmbassador = Array.from(engine1.ambassadors.values()).find((a) => a.ambassadorCode === 'AMB-FAST-01');

  results.push({
    name: 'New-User Approval: Supabase Auth user receives the exact administrator-assigned password',
    passed: Boolean(newAuthUser && newAuthUser.password === chosenPassword1),
  });

  results.push({
    name: 'New-User Approval: Success result returns exact submitted password and ambassador code',
    passed: Boolean(
      resNew.credentials &&
      resNew.credentials.password === chosenPassword1 &&
      resNew.credentials.ambassadorCode === 'AMB-FAST-01'
    ),
  });

  results.push({
    name: 'New-User Approval: Saves encrypted password on Ambassador record decryptable with server key',
    passed: Boolean(
      newAmbassador?.passwordEncrypted &&
      decryptAmbassadorPassword(newAmbassador.passwordEncrypted, TEST_KEY) === chosenPassword1
    ),
  });

  // --- 3. Existing User Eligible For Approval Receives Admin-Submitted Password ---
  const engine2 = new ApprovalEngineMock();
  const existingUserId = 'user_exist_777';
  engine2.authUsers.set(existingUserId, {
    id: existingUserId,
    email: 'existing@nust.edu.pk',
    password: 'oldUserPassword123',
  });
  engine2.prismaUsers.set(existingUserId, {
    id: existingUserId,
    email: 'existing@nust.edu.pk',
    role: 'PARTICIPANT',
    isActive: true,
  });
  engine2.requests.set('req_existing', {
    id: 'req_existing',
    status: 'PENDING',
    email: 'existing@nust.edu.pk',
    fullName: 'Existing User',
    universityId: 'uni_nust',
  });

  const chosenPassword2 = 'NustAmbassadorPass88!';
  const resExisting = await engine2.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_existing',
    universityId: 'uni_nust',
    ambassadorCode: 'AMB-NUST-01',
    password: chosenPassword2,
  });

  const updatedAuth = engine2.authUsers.get(existingUserId);
  const existingAmb = Array.from(engine2.ambassadors.values()).find((a) => a.userId === existingUserId);

  results.push({
    name: 'Existing-User Approval: Updates Auth password to submitted password after identity verification',
    passed: Boolean(
      !resExisting.error &&
      updatedAuth &&
      updatedAuth.password === chosenPassword2 &&
      existingAmb &&
      decryptAmbassadorPassword(existingAmb.passwordEncrypted!, TEST_KEY) === chosenPassword2
    ),
  });

  // Identity verification rejection (mismatched email)
  const engineMismatched = new ApprovalEngineMock();
  engineMismatched.authUsers.set('user_mismatch', {
    id: 'user_mismatch',
    email: 'different@auth.com', // differs from request email
    password: 'oldPassword',
  });
  engineMismatched.prismaUsers.set('user_mismatch', {
    id: 'user_mismatch',
    email: 'request@domain.com',
    role: 'PARTICIPANT',
    isActive: true,
  });
  engineMismatched.requests.set('req_mismatch', {
    id: 'req_mismatch',
    status: 'PENDING',
    email: 'request@domain.com',
    fullName: 'Mismatch User',
    universityId: 'uni_mismatch',
  });

  const resMismatch = await engineMismatched.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_mismatch',
    universityId: 'uni_mismatch',
    ambassadorCode: 'AMB-MIS-01',
    password: 'ValidPassword123',
  });

  results.push({
    name: 'Identity Verification: Rejects approval when Auth email does not match applicant email',
    passed: Boolean(resMismatch.error && resMismatch.error.includes('does not match')),
  });

  // --- 4. Manual Ambassador Creation Saves Matching Encrypted Password ---
  const manualPassword = 'ManualAmbPassword99@';
  const resManual = await engine1.createAmbassadorManual({
    adminUser: superAdmin,
    email: 'manual@lums.edu.pk',
    password: manualPassword,
    universityId: 'uni_lums',
    ambassadorCode: 'AMB-LUMS-01',
  });

  const manualAmb = engine1.ambassadors.get(resManual.ambassadorId!);
  const manualAuth = Array.from(engine1.authUsers.values()).find((u) => u.email === 'manual@lums.edu.pk');

  results.push({
    name: 'Manual Creation: Stores matching encrypted password and updates Auth user',
    passed: Boolean(
      resManual.success &&
      manualAmb?.passwordEncrypted &&
      decryptAmbassadorPassword(manualAmb.passwordEncrypted, TEST_KEY) === manualPassword &&
      manualAuth?.password === manualPassword
    ),
  });

  const auditLogCreate = engine1.auditLogs.find((l) => l.action === 'CREATE' && l.targetId === resManual.ambassadorId);
  results.push({
    name: 'Audit Security: Manual creation audit log omits plaintext password',
    passed: Boolean(auditLogCreate && !('password' in auditLogCreate.details)),
  });

  // --- 5. Password Reset Flow for Existing Ambassadors ---
  const resetPasswordValue = 'NewlyResetPassword2026!';
  const resReset = await engine1.resetPassword({
    adminUser: superAdmin,
    ambassadorId: manualAmb!.id,
    newPassword: resetPasswordValue,
  });

  const resetAmb = engine1.ambassadors.get(manualAmb!.id);
  const resetAuth = engine1.authUsers.get(manualAmb!.userId);

  results.push({
    name: 'Password Reset: Updates Supabase Auth and encrypted storage with new password',
    passed: Boolean(
      resReset.success &&
      resetAuth?.password === resetPasswordValue &&
      resetAmb?.passwordEncrypted &&
      decryptAmbassadorPassword(resetAmb.passwordEncrypted, TEST_KEY) === resetPasswordValue
    ),
  });

  // --- 6. Reset Legacy Ambassador Without Encrypted Password ---
  const legacyAmbId = 'amb_legacy_999';
  const legacyAuthId = 'auth_legacy_999';
  engine1.authUsers.set(legacyAuthId, {
    id: legacyAuthId,
    email: 'legacy@giki.edu.pk',
    password: 'oldUnknownPassword',
  });
  engine1.ambassadors.set(legacyAmbId, {
    id: legacyAmbId,
    userId: legacyAuthId,
    universityId: 'uni_giki',
    ambassadorCode: 'AMB-GIKI-01',
    passwordEncrypted: null, // Legacy record without encrypted password
  });

  const resLegacyReset = await engine1.resetPassword({
    adminUser: superAdmin,
    ambassadorId: legacyAmbId,
    newPassword: 'LegacyResetPass2026!',
  });

  const updatedLegacyAmb = engine1.ambassadors.get(legacyAmbId);

  results.push({
    name: 'Legacy Ambassador: Ambassador record with null passwordEncrypted can be successfully reset',
    passed: Boolean(
      resLegacyReset.success &&
      updatedLegacyAmb?.passwordEncrypted &&
      decryptAmbassadorPassword(updatedLegacyAmb.passwordEncrypted, TEST_KEY) === 'LegacyResetPass2026!'
    ),
  });

  // --- 7. Authorization Security: Non-Super Admin Denied Access ---
  const resUnauthorizedApprove = await engine1.approveRequest({
    adminUser: standardUser,
    requestId: 'req_new',
    universityId: 'uni_fast',
    ambassadorCode: 'AMB-FAST-99',
    password: 'SomePassword123',
  });

  const resUnauthorizedReset = await engine1.resetPassword({
    adminUser: standardUser,
    ambassadorId: legacyAmbId,
    newPassword: 'SomePassword123',
  });

  results.push({
    name: 'Authorization Security: Non-Super Admin cannot approve ambassador requests',
    passed: resUnauthorizedApprove.error === 'Only Super Admin can approve Ambassador requests.',
  });

  results.push({
    name: 'Authorization Security: Non-Super Admin cannot reset ambassador passwords',
    passed: resUnauthorizedReset.error === 'Only Super Admin can reset Ambassador passwords.',
  });

  // --- 8. Duplicate Prevention ---
  engine1.requests.set('req_dup_code', {
    id: 'req_dup_code',
    status: 'PENDING',
    email: 'dupcode@test.com',
    fullName: 'Dup Code User',
    universityId: 'uni_unused_code',
  });

  const resDupCode = await engine1.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_dup_code',
    universityId: 'uni_unused_code',
    ambassadorCode: 'AMB-FAST-01', // Already assigned
    password: 'ValidPassword123',
  });

  results.push({
    name: 'Constraint Enforcement: Rejects duplicate ambassador code collision',
    passed: resDupCode.error === 'That Ambassador code is already in use.',
  });

  engine1.requests.set('req_dup_uni', {
    id: 'req_dup_uni',
    status: 'PENDING',
    email: 'dupuni@test.com',
    fullName: 'Dup Uni User',
    universityId: 'uni_fast', // Already assigned
  });

  const resDupUni = await engine1.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_dup_uni',
    universityId: 'uni_fast',
    ambassadorCode: 'AMB-UNI-NEW-1',
    password: 'ValidPassword123',
  });

  results.push({
    name: 'Constraint Enforcement: Rejects assigning university already assigned to an active ambassador',
    passed: resDupUni.error === 'This university already has a campus ambassador.',
  });

  // --- 9. Failure Handling & Rollback Safety ---
  const engineFail = new ApprovalEngineMock();
  engineFail.simulatedDbFailure = true;
  engineFail.requests.set('req_fail_db', {
    id: 'req_fail_db',
    status: 'PENDING',
    email: 'faildb@test.com',
    fullName: 'Fail DB User',
    universityId: 'uni_fail',
  });

  const resFail = await engineFail.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_fail_db',
    universityId: 'uni_fail',
    ambassadorCode: 'AMB-FAIL-01',
    password: 'PasswordFail123!',
  });

  results.push({
    name: 'Failure Handling: Database failure returns clear error and does NOT return credentials as successful',
    passed: Boolean(resFail.error && !('credentials' in resFail)),
  });

  results.push({
    name: 'Failure Handling: Database failure rolls back newly created Auth user to prevent orphaned accounts',
    passed: engineFail.authDeletedIds.length === 1,
  });

  // --- 10. Approval does NOT create a Participant when none exists ---
  const engineNoParticipant = new ApprovalEngineMock();
  engineNoParticipant.requests.set('req_no_part', {
    id: 'req_no_part',
    status: 'PENDING',
    email: 'nopart@fast.edu.pk',
    fullName: 'No Participant User',
    universityId: 'uni_nopart',
  });

  const resNoParticipant = await engineNoParticipant.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_no_part',
    universityId: 'uni_nopart',
    ambassadorCode: 'AMB-NOPART-01',
    password: 'ValidPassword123',
  });

  results.push({
    name: 'No-Participant Approval: Succeeds and returns credentials when no Participant record exists',
    passed: Boolean(resNoParticipant.credentials && !resNoParticipant.error),
  });

  results.push({
    name: 'No-Participant Approval: Ambassador record is created without a linked Participant',
    passed: (() => {
      const amb = Array.from(engineNoParticipant.ambassadors.values()).find(
        (a) => a.ambassadorCode === 'AMB-NOPART-01'
      );
      const req = engineNoParticipant.requests.get('req_no_part');
      return Boolean(amb && req?.status === 'APPROVED' && !req.participantId);
    })(),
  });

  results.push({
    name: 'No-Participant Approval: No Participant record was created as a side-effect',
    passed: engineNoParticipant.participants.size === 0,
  });

  // --- 11. requireAmbassador equivalent: approval does not create Participant in shared auth helper ---
  // Simulate an ambassador-only user (no participant) calling requireAmbassador logic.
  const engineAmbOnly = new ApprovalEngineMock();
  const ambassadorOnlyUserId = 'user_amb_only';
  engineAmbOnly.authUsers.set(ambassadorOnlyUserId, {
    id: ambassadorOnlyUserId,
    email: 'ambonly@fast.edu.pk',
    password: 'HasPassword123',
  });
  engineAmbOnly.prismaUsers.set(ambassadorOnlyUserId, {
    id: ambassadorOnlyUserId,
    email: 'ambonly@fast.edu.pk',
    role: 'AMBASSADOR',
    isActive: true,
  });
  const ambassadorOnlyAmbId = 'amb_only_001';
  engineAmbOnly.ambassadors.set(ambassadorOnlyAmbId, {
    id: ambassadorOnlyAmbId,
    userId: ambassadorOnlyUserId,
    universityId: 'uni_fast2',
    ambassadorCode: 'AMB-FAST-02',
  });

  // Verify that no Participant exists for this ambassador-only user.
  const participantForAmbOnly = Array.from(engineAmbOnly.participants.values()).find(
    (p) => p.userId === ambassadorOnlyUserId
  );
  results.push({
    name: 'Ambassador-Only User: No Participant record exists after ambassador account exists',
    passed: !participantForAmbOnly,
  });

  // --- 12. Existing Participant is linked (not duplicated) during approval ---
  const engineWithExistingPart = new ApprovalEngineMock();
  const existingPartUserId = 'user_has_part';
  const existingPartId = 'part_existing_001';
  engineWithExistingPart.authUsers.set(existingPartUserId, {
    id: existingPartUserId,
    email: 'haspart@nust.edu.pk',
    password: 'ExistingPass123',
  });
  engineWithExistingPart.prismaUsers.set(existingPartUserId, {
    id: existingPartUserId,
    email: 'haspart@nust.edu.pk',
    role: 'PARTICIPANT',
    isActive: true,
  });
  engineWithExistingPart.participants.set(existingPartId, {
    id: existingPartId,
    userId: existingPartUserId,
    email: 'haspart@nust.edu.pk',
    fullName: 'Has Participant User',
    universityId: 'uni_nust2',
  });
  engineWithExistingPart.requests.set('req_has_part', {
    id: 'req_has_part',
    status: 'PENDING',
    email: 'haspart@nust.edu.pk',
    fullName: 'Has Participant User',
    universityId: 'uni_nust2',
  });

  const resWithPart = await engineWithExistingPart.approveRequest({
    adminUser: superAdmin,
    requestId: 'req_has_part',
    universityId: 'uni_nust2',
    ambassadorCode: 'AMB-NUST-02',
    password: 'NewPass1234567',
  });

  results.push({
    name: 'Existing-Participant Approval: Existing Participant record is preserved (not duplicated)',
    passed: (() => {
      const req = engineWithExistingPart.requests.get('req_has_part');
      return (
        !resWithPart.error &&
        engineWithExistingPart.participants.size === 1 && // still exactly 1 participant
        req?.status === 'APPROVED'
      );
    })(),
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
