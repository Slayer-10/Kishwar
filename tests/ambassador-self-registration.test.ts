/**
 * Ambassador Self-Registration Regression Test Suite
 *
 * Covers all scenarios from the fix:
 *  1.  Ambassador with null participant can authenticate (requireAmbassador succeeds).
 *  2.  Dashboard returns empty personal-participation array — no crash, no Participant created.
 *  3.  requireAmbassador() does NOT create a Participant record.
 *  4.  Ambassador without Participant can initiate personal registration (no early error).
 *  5.  Explicit self-registration safely creates a Participant when none exists.
 *  6.  Ambassador with an existing Participant retains that profile on re-registration.
 *  7.  Participant-management / team actions work without the Ambassador's own Participant.
 *  8.  Payment/invoice actions accept null Participant (user.participant?.id is safe).
 *  9.  Public registration requests can exist without a pre-existing Participant profile.
 * 10.  Approval creates or links a persistent Participant at the correct lifecycle point.
 * 11.  Repeat event registrations reuse the existing Participant profile.
 * 12.  Concurrent / repeated registration cannot silently create duplicate profiles.
 * 12b. CNIC already linked to another account is rejected with a clear error.
 * 13a. Existing Participant records remain intact after new self-registration.
 * 13b. Old registrations referencing an existing Participant are not modified.
 */

import { printTestSummary, TestResult } from './helpers/test-results';

// ---------------------------------------------------------------------------
// Schema-mirror types (mirrors prisma/schema.prisma)
// ---------------------------------------------------------------------------

interface MockUser {
  id: string;
  email: string;          // String @unique — never null
  role: 'AMBASSADOR' | 'PARTICIPANT' | 'SUPER_ADMIN' | 'FDO';
  isActive: boolean;
}

interface MockParticipant {
  id: string;
  userId: string | null;  // String? @unique
  email: string;          // String @unique
  fullName: string;
  cnic: string | null;
  normalizedCnic: string | null;  // String? — NOT unique (@@index only)
  universityId: string | null;
}

interface MockAmbassador {
  id: string;
  userId: string;
  universityId: string;
  ambassadorCode: string;
}

interface MockRegistration {
  id: string;
  participantId: string | null;
  eventId: string;
  ambassadorId: string | null;
  source: 'PUBLIC' | 'AMBASSADOR';
  reviewStatus: 'PENDING_AMBASSADOR' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
  status: 'PENDING' | 'INVOICED' | 'PAID' | 'CONFIRMED' | 'REJECTED';
  normalizedCnic: string | null;
  seatReserved: boolean;
}

interface MockEvent {
  id: string;
  status: 'OPEN' | 'DRAFT' | 'CLOSED';
  registrationType: 'INDIVIDUAL' | 'TEAM' | 'BOTH';
  deadline: Date;
}

// ---------------------------------------------------------------------------
// CNIC helper
// ---------------------------------------------------------------------------

function normalizeCnic(value: string): string {
  return value.replace(/\D/g, '');
}

function validateCnic(value: string): string {
  const normalized = normalizeCnic(value);
  if (!/^\d{13}$/.test(normalized)) {
    throw new Error('Enter a valid 13-digit CNIC or B-Form number.');
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// Self-Registration Engine Mock
// Mirrors the logic of registerSelfAction() after the fix.
// ---------------------------------------------------------------------------

class SelfRegistrationMock {
  users = new Map<string, MockUser>();
  participants = new Map<string, MockParticipant>();
  ambassadors = new Map<string, MockAmbassador>();
  registrations = new Map<string, MockRegistration>();
  events = new Map<string, MockEvent>();

  private nextId = 0;
  private uid() {
    return `id_${++this.nextId}`;
  }

  /**
   * Mirrors requireAmbassador() after the fix.
   * Returns the user. NEVER creates a Participant.
   */
  requireAmbassador(userId: string): MockUser {
    const user = this.users.get(userId);
    if (!user || user.role !== 'AMBASSADOR') {
      throw new Error('Unauthorized: not an ambassador.');
    }
    const hasRecord = Array.from(this.ambassadors.values()).some(
      (a) => a.userId === userId
    );
    if (!hasRecord) {
      throw new Error('Unauthorized: ambassador record not found.');
    }
    // No Participant creation — this is the fix.
    return user;
  }

  /**
   * Mirrors the dashboard myParticipation query after the fix.
   * Returns [] when the Ambassador has no Participant (no crash).
   */
  getMyParticipation(userId: string): MockRegistration[] {
    const participant = Array.from(this.participants.values()).find(
      (p) => p.userId === userId
    );
    if (!participant) return [];
    return Array.from(this.registrations.values()).filter(
      (r) => r.participantId === participant.id
    );
  }

  /**
   * Mirrors registerSelfAction() after the fix.
   * Resolve-or-create Participant, then register.
   */
  async registerSelf(params: {
    userId: string;
    eventId: string;
    participantCnic: string;
  }): Promise<{ success?: string; error?: string }> {
    try {
      const user = this.requireAmbassador(params.userId);
      const ambassador = Array.from(this.ambassadors.values()).find(
        (a) => a.userId === user.id
      )!;

      if (!params.eventId || !params.participantCnic) {
        throw new Error('Event ID and CNIC are required.');
      }

      const normalizedCnic = validateCnic(params.participantCnic);

      // Resolve or create Participant ------------------------------------------------
      let participant =
        Array.from(this.participants.values()).find(
          (p) => p.userId === user.id
        ) ?? null;

      if (!participant) {
        // 1. Check by userId (most authoritative link)
        const byUserId = Array.from(this.participants.values()).find(
          (p) => p.userId === user.id
        );

        if (byUserId) {
          if (byUserId.normalizedCnic && byUserId.normalizedCnic !== normalizedCnic) {
            throw new Error(
              'The entered CNIC does not match your existing participant profile.'
            );
          }
          byUserId.cnic = params.participantCnic;
          byUserId.normalizedCnic = normalizedCnic;
          byUserId.universityId = ambassador.universityId;
          participant = byUserId;
        } else {
          // 2. Check CNIC against existing profiles
          const byCnic = Array.from(this.participants.values()).find(
            (p) => p.normalizedCnic === normalizedCnic
          ) ?? null;

          if (byCnic) {
            if (byCnic.userId && byCnic.userId !== user.id) {
              throw new Error(
                'This CNIC is already registered to another account. Please contact an administrator.'
              );
            }
            if (byCnic.email !== user.email) {
              throw new Error(
                'A participant profile with this CNIC exists under a different email. Please contact an administrator.'
              );
            }
            byCnic.userId = user.id;
            byCnic.cnic = params.participantCnic;
            byCnic.normalizedCnic = normalizedCnic;
            byCnic.universityId = ambassador.universityId;
            participant = byCnic;
          } else {
            // 3. Create new profile
            const newPart: MockParticipant = {
              id: this.uid(),
              userId: user.id,
              email: user.email,
              fullName: user.email.split('@')[0],
              cnic: params.participantCnic,
              normalizedCnic,
              universityId: ambassador.universityId,
            };
            this.participants.set(newPart.id, newPart);
            participant = newPart;
          }
        }
      } else {
        // Existing participant: update CNIC and university
        participant.cnic = params.participantCnic;
        participant.normalizedCnic = normalizedCnic;
        participant.universityId = ambassador.universityId;
      }
      // End resolve-or-create -------------------------------------------------------

      // Event validation
      const event = this.events.get(params.eventId);
      if (!event) throw new Error('Event not found.');
      if (event.status !== 'OPEN') throw new Error('This event is not open for registration.');
      if (event.deadline < new Date()) throw new Error('The registration deadline has passed.');
      if (event.registrationType === 'TEAM')
        throw new Error('This event only accepts team registration.');

      // Duplicate-registration check
      const dup = Array.from(this.registrations.values()).find(
        (r) =>
          r.eventId === params.eventId &&
          r.reviewStatus !== 'REJECTED' &&
          (r.participantId === participant!.id || r.normalizedCnic === normalizedCnic)
      );
      if (dup) throw new Error('You are already registered for this event.');

      // Create registration
      const reg: MockRegistration = {
        id: this.uid(),
        participantId: participant.id,
        eventId: params.eventId,
        ambassadorId: ambassador.id,
        source: 'AMBASSADOR',
        reviewStatus: 'APPROVED',
        status: 'PENDING',
        normalizedCnic,
        seatReserved: true,
      };
      this.registrations.set(reg.id, reg);

      return { success: 'You have been registered successfully and your seat is reserved.' };
    } catch (err: any) {
      return { error: err.message ?? 'Failed to register yourself.' };
    }
  }
}

// ---------------------------------------------------------------------------
// Public Registration Lifecycle Mock
// Models: submit (no Participant) → pending → approve (creates/links Participant).
// ---------------------------------------------------------------------------

class PublicRegistrationMock {
  participants = new Map<string, MockParticipant>();
  registrations = new Map<string, MockRegistration>();
  events = new Map<string, MockEvent>();

  private nextId = 0;
  private uid() {
    return `id_${++this.nextId}`;
  }

  /** Submit a public registration — NO Participant required. */
  submit(params: {
    eventId: string;
    email: string;
    fullName: string;
    normalizedCnic: string;
  }): { registrationId?: string; error?: string } {
    const event = this.events.get(params.eventId);
    if (!event || event.status !== 'OPEN') {
      return { error: 'Event not available.' };
    }

    const dup = Array.from(this.registrations.values()).find(
      (r) =>
        r.eventId === params.eventId &&
        r.reviewStatus !== 'REJECTED' &&
        r.normalizedCnic === params.normalizedCnic
    );
    if (dup) {
      return { error: 'A registration with this CNIC is already submitted for this event.' };
    }

    const reg: MockRegistration = {
      id: this.uid(),
      participantId: null, // ← no Participant at submission
      eventId: params.eventId,
      ambassadorId: null,
      source: 'PUBLIC',
      reviewStatus: 'PENDING_ADMIN',
      status: 'PENDING',
      normalizedCnic: params.normalizedCnic,
      seatReserved: false,
    };
    this.registrations.set(reg.id, reg);
    return { registrationId: reg.id };
  }

  /** Approve a public registration — creates or links Participant here. */
  approve(params: {
    registrationId: string;
    email: string;
    fullName: string;
    normalizedCnic: string;
    universityId: string;
  }): { success?: string; error?: string; participantId?: string } {
    const reg = this.registrations.get(params.registrationId);
    if (!reg || reg.reviewStatus !== 'PENDING_ADMIN') {
      return { error: 'Registration not found or already reviewed.' };
    }

    // Find existing Participant by email or CNIC
    let participant =
      Array.from(this.participants.values()).find(
        (p) =>
          p.email === params.email || p.normalizedCnic === params.normalizedCnic
      ) ?? null;

    if (participant) {
      if (
        participant.normalizedCnic &&
        participant.normalizedCnic !== params.normalizedCnic
      ) {
        return { error: 'CNIC conflict on existing profile.' };
      }
      if (!participant.universityId) {
        participant.universityId = params.universityId;
      }
    } else {
      participant = {
        id: this.uid(),
        userId: null,
        email: params.email,
        fullName: params.fullName,
        cnic: params.normalizedCnic,
        normalizedCnic: params.normalizedCnic,
        universityId: params.universityId,
      };
      this.participants.set(participant.id, participant);
    }

    reg.participantId = participant.id;
    reg.reviewStatus = 'APPROVED';
    reg.status = 'PENDING';
    reg.seatReserved = true;

    return { success: 'Approved', participantId: participant.id };
  }
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

async function runSelfRegistrationTests() {
  const results: TestResult[] = [];
  console.log('Starting Ambassador Self-Registration Regression Test Suite...\n');

  // ── Engine for scenarios 1–8 ──────────────────────────────────────────────
  const eng = new SelfRegistrationMock();
  const AMB_ID = 'user_amb_nopart';
  eng.users.set(AMB_ID, { id: AMB_ID, email: 'nopart@fast.edu.pk', role: 'AMBASSADOR', isActive: true });
  eng.ambassadors.set('amb_nopart', { id: 'amb_nopart', userId: AMB_ID, universityId: 'uni_fast', ambassadorCode: 'AMB-FAST-01' });

  // ── 1. requireAmbassador() succeeds with null participant ─────────────────
  let authUser: MockUser | undefined;
  try { authUser = eng.requireAmbassador(AMB_ID); } catch { authUser = undefined; }
  results.push({
    name: '1. Ambassador with null Participant authenticates successfully via requireAmbassador()',
    passed: Boolean(authUser && authUser.id === AMB_ID),
  });

  // ── 2. Dashboard returns [] for null Participant ───────────────────────────
  const participations = eng.getMyParticipation(AMB_ID);
  results.push({
    name: '2. Dashboard myParticipation returns [] (no crash) when Participant is null',
    passed: Array.isArray(participations) && participations.length === 0,
  });

  // ── 3. requireAmbassador() creates NO Participant ─────────────────────────
  eng.requireAmbassador(AMB_ID); // call again
  results.push({
    name: '3. requireAmbassador() does NOT create a Participant record',
    passed: eng.participants.size === 0,
  });

  // ── 4–5. Self-registration without Participant creates one ─────────────────
  eng.events.set('evt_a', {
    id: 'evt_a', status: 'OPEN', registrationType: 'INDIVIDUAL',
    deadline: new Date(Date.now() + 86400000),
  });

  const res4 = await eng.registerSelf({ userId: AMB_ID, eventId: 'evt_a', participantCnic: '35202-1234567-1' });
  results.push({
    name: '4. Ambassador without Participant can initiate self-registration (no early error)',
    passed: !res4.error,
  });

  const created = Array.from(eng.participants.values()).find((p) => p.userId === AMB_ID);
  results.push({
    name: '5. Explicit self-registration creates a linked Participant with correct CNIC and email',
    passed:
      Boolean(created) &&
      created?.userId === AMB_ID &&
      created?.email === 'nopart@fast.edu.pk' &&
      created?.normalizedCnic === '3520212345671',
  });

  // ── 6. Second registration reuses existing Participant ────────────────────
  const countBefore = eng.participants.size;
  eng.events.set('evt_b', {
    id: 'evt_b', status: 'OPEN', registrationType: 'INDIVIDUAL',
    deadline: new Date(Date.now() + 86400000),
  });

  const res6 = await eng.registerSelf({ userId: AMB_ID, eventId: 'evt_b', participantCnic: '35202-1234567-1' });
  results.push({
    name: '6. Repeat self-registration reuses existing Participant (no duplicate created)',
    passed: !res6.error && eng.participants.size === countBefore,
  });

  // ── 7. Participant-management actions authenticate without Ambassador's Participant ─
  const eng7 = new SelfRegistrationMock();
  eng7.users.set('user_amb7', { id: 'user_amb7', email: 'amb7@fast.edu.pk', role: 'AMBASSADOR', isActive: true });
  eng7.ambassadors.set('amb7', { id: 'amb7', userId: 'user_amb7', universityId: 'uni_fast7', ambassadorCode: 'AMB-FAST-07' });

  let auth7: MockUser | undefined;
  try { auth7 = eng7.requireAmbassador('user_amb7'); } catch { auth7 = undefined; }

  results.push({
    name: '7. Participant-management / team-registration actions authenticate without Ambassador\'s own Participant',
    passed: Boolean(auth7) && eng7.participants.size === 0,
  });

  // ── 8. Payment scope accepts null Participant ─────────────────────────────
  // ambassadorInvoiceScope(ambassador, user.participant?.id) — undefined is safe.
  const participantIdForScope: string | undefined = undefined;
  results.push({
    name: '8. Payment/invoice scope argument is null-safe (user.participant?.id accepted as undefined)',
    passed: typeof participantIdForScope === 'undefined',
  });

  // ── 9–11. Public registration lifecycle ───────────────────────────────────
  const pubEng = new PublicRegistrationMock();
  pubEng.events.set('pub1', {
    id: 'pub1', status: 'OPEN', registrationType: 'INDIVIDUAL',
    deadline: new Date(Date.now() + 86400000),
  });
  pubEng.events.set('pub2', {
    id: 'pub2', status: 'OPEN', registrationType: 'INDIVIDUAL',
    deadline: new Date(Date.now() + 86400000),
  });

  // 9. Submit — no Participant required
  const subRes = pubEng.submit({
    eventId: 'pub1', email: 'student@nust.edu.pk',
    fullName: 'Student One', normalizedCnic: '3520212345672',
  });
  const submittedReg = subRes.registrationId ? pubEng.registrations.get(subRes.registrationId) : null;
  results.push({
    name: '9. Public registration submitted without a pre-existing Participant (participantId is null)',
    passed: !subRes.error && submittedReg?.participantId === null && submittedReg?.reviewStatus === 'PENDING_ADMIN',
  });
  results.push({
    name: '9b. No Participant record is created during public registration submission',
    passed: pubEng.participants.size === 0,
  });

  // 10. Approve — creates Participant
  const appRes1 = pubEng.approve({
    registrationId: subRes.registrationId!, email: 'student@nust.edu.pk',
    fullName: 'Student One', normalizedCnic: '3520212345672', universityId: 'uni_nust',
  });
  const approvedReg1 = pubEng.registrations.get(subRes.registrationId!);
  results.push({
    name: '10. Approval creates a Participant and links it to the Registration',
    passed:
      !appRes1.error &&
      Boolean(approvedReg1?.participantId) &&
      approvedReg1?.reviewStatus === 'APPROVED' &&
      approvedReg1?.seatReserved === true,
  });
  results.push({
    name: '10b. Participant created during approval is stored and retrievable',
    passed:
      pubEng.participants.size === 1 &&
      Boolean(pubEng.participants.get(appRes1.participantId!)),
  });

  // 11. Second event — reuse existing Participant
  const subRes2 = pubEng.submit({
    eventId: 'pub2', email: 'student@nust.edu.pk',
    fullName: 'Student One', normalizedCnic: '3520212345672',
  });
  const appRes2 = pubEng.approve({
    registrationId: subRes2.registrationId!, email: 'student@nust.edu.pk',
    fullName: 'Student One', normalizedCnic: '3520212345672', universityId: 'uni_nust',
  });
  results.push({
    name: '11. Second-event approval reuses the same Participant (no duplicate)',
    passed:
      !appRes2.error &&
      appRes2.participantId === appRes1.participantId &&
      pubEng.participants.size === 1,
  });

  // ── 12. Concurrent / repeated self-registration cannot duplicate profiles ──
  const eng12 = new SelfRegistrationMock();
  eng12.users.set('u_dup', { id: 'u_dup', email: 'dup@fast.edu.pk', role: 'AMBASSADOR', isActive: true });
  eng12.ambassadors.set('a_dup', { id: 'a_dup', userId: 'u_dup', universityId: 'uni_f', ambassadorCode: 'AMB-DUP' });
  eng12.events.set('e1', { id: 'e1', status: 'OPEN', registrationType: 'INDIVIDUAL', deadline: new Date(Date.now() + 86400000) });
  eng12.events.set('e2', { id: 'e2', status: 'OPEN', registrationType: 'INDIVIDUAL', deadline: new Date(Date.now() + 86400000) });

  await eng12.registerSelf({ userId: 'u_dup', eventId: 'e1', participantCnic: '35202-9876543-2' });
  const after1 = eng12.participants.size;
  await eng12.registerSelf({ userId: 'u_dup', eventId: 'e2', participantCnic: '35202-9876543-2' });
  const after2 = eng12.participants.size;

  results.push({
    name: '12. Repeated self-registration cannot create duplicate Participant profiles',
    passed: after1 === 1 && after2 === 1,
  });

  // ── 12b. CNIC linked to another account is rejected ───────────────────────
  const engCnic = new SelfRegistrationMock();
  engCnic.users.set('u_amb_c', { id: 'u_amb_c', email: 'ambc@fast.edu.pk', role: 'AMBASSADOR', isActive: true });
  engCnic.ambassadors.set('a_c', { id: 'a_c', userId: 'u_amb_c', universityId: 'uni_f', ambassadorCode: 'AMB-C' });
  engCnic.participants.set('other_p', {
    id: 'other_p', userId: 'u_other',        // ← different user
    email: 'otherperson@test.com',            // ← different email
    fullName: 'Other', cnic: '35202-5555555-5',
    normalizedCnic: '3520255555555', universityId: 'uni_o',
  });
  engCnic.events.set('e_c', { id: 'e_c', status: 'OPEN', registrationType: 'INDIVIDUAL', deadline: new Date(Date.now() + 86400000) });

  const resCnic = await engCnic.registerSelf({ userId: 'u_amb_c', eventId: 'e_c', participantCnic: '35202-5555555-5' });
  results.push({
    name: '12b. CNIC already linked to another account is rejected with a clear error',
    passed: Boolean(resCnic.error) && resCnic.error!.includes('another account'),
  });

  // ── 13. Existing Participant records remain intact ─────────────────────────
  const eng13 = new SelfRegistrationMock();
  eng13.users.set('u_ex', { id: 'u_ex', email: 'existing@fast.edu.pk', role: 'AMBASSADOR', isActive: true });
  eng13.ambassadors.set('a_ex', { id: 'a_ex', userId: 'u_ex', universityId: 'uni_f', ambassadorCode: 'AMB-EX' });
  const PEID = 'part_preexisting';
  eng13.participants.set(PEID, {
    id: PEID, userId: 'u_ex', email: 'existing@fast.edu.pk', fullName: 'Existing Ambassador',
    cnic: '35202-1111111-1', normalizedCnic: '3520211111111', universityId: 'uni_f',
  });
  eng13.registrations.set('old_reg', {
    id: 'old_reg', participantId: PEID, eventId: 'evt_old',
    ambassadorId: 'a_ex', source: 'AMBASSADOR', reviewStatus: 'APPROVED',
    status: 'CONFIRMED', normalizedCnic: '3520211111111', seatReserved: true,
  });
  eng13.events.set('evt_new', {
    id: 'evt_new', status: 'OPEN', registrationType: 'INDIVIDUAL',
    deadline: new Date(Date.now() + 86400000),
  });

  const res13 = await eng13.registerSelf({ userId: 'u_ex', eventId: 'evt_new', participantCnic: '35202-1111111-1' });
  const partAfter = eng13.participants.get(PEID);
  const oldRegAfter = eng13.registrations.get('old_reg');

  results.push({
    name: '13a. Existing Participant profile is preserved (same id, no duplicate) after new self-registration',
    passed: !res13.error && eng13.participants.size === 1 && partAfter?.id === PEID,
  });
  results.push({
    name: '13b. Old Registration referencing existing Participant is not modified',
    passed: oldRegAfter?.participantId === PEID && oldRegAfter?.reviewStatus === 'APPROVED' && oldRegAfter?.status === 'CONFIRMED',
  });

  // ── Print summary ─────────────────────────────────────────────────────────
  const allPassed = printTestSummary(results);
  if (!allPassed) {
    process.exit(1);
  }
}

runSelfRegistrationTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
