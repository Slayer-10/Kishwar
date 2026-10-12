import { prisma } from '../lib/prisma';
import { submitPublicIndividualRegistrationAction } from '../app/(public)/events/[id]/actions';
import { summarizeResults, printTestSummary, TestResult } from './helpers/test-results';

async function runPublicRegistrationTests() {
  const results: TestResult[] = [];
  const cleanupRegistrationIds: string[] = [];
  const cleanupParticipantIds: string[] = [];

  console.log('Starting Public Student Registration Automated QA Suite...\n');

  try {
    // 1. Identify or setup test event
    const event = await prisma.event.findFirst({
      where: {
        status: 'OPEN',
        registrationType: 'INDIVIDUAL',
        deadline: { gt: new Date() },
      },
    });

    if (!event) {
      throw new Error('No open individual event found for testing');
    }

    // 2. Identify University WITH active Ambassador
    const uniWithAmbassador = await prisma.university.findFirst({
      where: {
        ambassadors: {
          some: { user: { isActive: true } },
        },
      },
      include: {
        ambassadors: {
          where: { user: { isActive: true } },
          include: { user: true },
        },
      },
    });

    if (!uniWithAmbassador || uniWithAmbassador.ambassadors.length === 0) {
      throw new Error('No university with an active ambassador found for testing');
    }
    const expectedAmbassador = uniWithAmbassador.ambassadors[0];

    // 3. Identify University WITHOUT active Ambassador
    let uniWithoutAmbassador = await prisma.university.findFirst({
      where: {
        ambassadors: {
          none: {},
        },
      },
    });

    if (!uniWithoutAmbassador) {
      uniWithoutAmbassador = await prisma.university.create({
        data: {
          name: `Unrepresented Test University ${Date.now()}`,
          city: 'Test City',
        },
      });
    }

    const validPdfBlob = new Blob(['%PDF-1.4 mock pdf content for student card verification'], {
      type: 'application/pdf',
    });
    const validPngBlob = new Blob(['mock png bytes payment screenshot evidence'], {
      type: 'image/png',
    });

    // --- TEST 1: Missing Student Verification Document rejected ---
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'Student No Doc');
      formData.append('email', `nodoc_${Date.now()}@example.com`);
      formData.append('phone', '03001234567');
      formData.append('cnic', '35201-9999991-1');
      formData.append('universityId', uniWithAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');

      const res = await submitPublicIndividualRegistrationAction({}, formData);
      results.push({
        name: 'Missing Student Doc: Rejected with clear error message',
        passed: res.error === 'Student verification document is required.',
        details: res.error,
      });
    }

    // --- TEST 2: Invalid file type rejected ---
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'Student Invalid File');
      formData.append('email', `invalidfile_${Date.now()}@example.com`);
      formData.append('phone', '03001234567');
      formData.append('cnic', '35201-9999992-1');
      formData.append('universityId', uniWithAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');

      const txtBlob = new Blob(['not an image or pdf'], { type: 'text/plain' });
      formData.append('studentDocument', new File([txtBlob], 'resume.txt', { type: 'text/plain' }));

      const res = await submitPublicIndividualRegistrationAction({}, formData);
      results.push({
        name: 'Invalid File Type: Rejected with supported format message',
        passed: res.error === 'Student verification document must be a PDF, JPG, PNG, or WEBP file.',
        details: res.error,
      });
    }

    // --- TEST 3: Oversized file rejected ---
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'Student Oversized File');
      formData.append('email', `oversized_${Date.now()}@example.com`);
      formData.append('phone', '03001234567');
      formData.append('cnic', '35201-9999993-1');
      formData.append('universityId', uniWithAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');

      // 9 MB mock file
      const largeBlob = new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'application/pdf' });
      formData.append('studentDocument', new File([largeBlob], 'huge.pdf', { type: 'application/pdf' }));

      const res = await submitPublicIndividualRegistrationAction({}, formData);
      results.push({
        name: 'Oversized File: Rejected with maximum 8 MB error message',
        passed: res.error === 'Student verification document must be 8 MB or smaller.',
        details: res.error,
      });
    }

    // --- TEST 4: Invalid CNIC rejected ---
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'Student Bad CNIC');
      formData.append('email', `badcnic_${Date.now()}@example.com`);
      formData.append('phone', '03001234567');
      formData.append('cnic', '12345'); // invalid
      formData.append('universityId', uniWithAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');
      formData.append('studentDocument', new File([validPdfBlob], 'card.pdf', { type: 'application/pdf' }));

      const res = await submitPublicIndividualRegistrationAction({}, formData);
      results.push({
        name: 'Invalid CNIC: Rejected with 13-digit requirement message',
        passed: res.error === 'Enter a valid 13-digit CNIC or B-Form number.',
        details: res.error,
      });
    }

    // --- TEST 5: Active Ambassador University: Submit WITHOUT payment evidence ---
    const ambEmail = `amb_student_${Date.now()}@example.com`;
    const ambCnic = '35201-1112223-1';
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'Ambassador University Student');
      formData.append('email', ambEmail);
      formData.append('phone', '03001234567');
      formData.append('cnic', ambCnic);
      formData.append('universityId', uniWithAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');
      formData.append('studentDocument', new File([validPdfBlob], 'student-id.pdf', { type: 'application/pdf' }));
      // NO payment proof attached!

      const res = await submitPublicIndividualRegistrationAction({}, formData);

      const dbReg = await prisma.registration.findFirst({
        where: {
          eventId: event.id,
          participant: { email: ambEmail },
        },
        include: { evidence: true },
      });

      if (dbReg) {
        cleanupRegistrationIds.push(dbReg.id);
        if (dbReg.participantId) cleanupParticipantIds.push(dbReg.participantId);
      }

      const passed =
        Boolean(res.success?.includes('Ambassador review')) &&
        Boolean(dbReg) &&
        dbReg?.ambassadorId === expectedAmbassador.id &&
        dbReg?.reviewStatus === 'PENDING_AMBASSADOR' &&
        dbReg?.source === 'PUBLIC' &&
        dbReg?.evidence.length === 1 &&
        dbReg?.evidence[0].type === 'STUDENT_DOCUMENT';

      results.push({
        name: 'Active Ambassador: Submits without payment proof, assigned to Ambassador (PENDING_AMBASSADOR)',
        passed,
        details: passed ? 'Assigned to ambassador ' + expectedAmbassador.id : JSON.stringify({ res, dbReg }),
      });
    }

    // --- TEST 6: Prevent duplicate submission with same email or CNIC ---
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'Duplicate Student Attempt');
      formData.append('email', ambEmail); // Same email as Test 5
      formData.append('phone', '03001234567');
      formData.append('cnic', ambCnic);
      formData.append('universityId', uniWithAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');
      formData.append('studentDocument', new File([validPdfBlob], 'student-id.pdf', { type: 'application/pdf' }));

      const res = await submitPublicIndividualRegistrationAction({}, formData);
      results.push({
        name: 'Duplicate Prevention: Re-registration with same email/CNIC rejected',
        passed: Boolean(res.error?.includes('already submitted')),
        details: res.error,
      });
    }

    // --- TEST 7: No Ambassador University: Missing payment screenshot rejected ---
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'No Ambassador Student No Pay');
      formData.append('email', `noamb_nopay_${Date.now()}@example.com`);
      formData.append('phone', '03001234567');
      formData.append('cnic', '35201-3334445-1');
      formData.append('universityId', uniWithoutAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');
      formData.append('studentDocument', new File([validPdfBlob], 'student-id.pdf', { type: 'application/pdf' }));
      // NO payment proof!

      const res = await submitPublicIndividualRegistrationAction({}, formData);
      results.push({
        name: 'No Ambassador: Payment screenshot is mandatory and missing payment is rejected',
        passed: Boolean(res.error?.includes('payment screenshot')),
        details: res.error,
      });
    }

    // --- TEST 8: No Ambassador University: Valid submission with payment proof goes to Admin queue ---
    const adminEmail = `admin_queue_${Date.now()}@example.com`;
    {
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('fullName', 'Admin Queue Student');
      formData.append('email', adminEmail);
      formData.append('phone', '03009876543');
      formData.append('cnic', '35201-5556667-1');
      formData.append('universityId', uniWithoutAmbassador.id);
      formData.append('accommodationSelection', 'NONE_OR_ALREADY_ARRANGED');
      formData.append('studentDocument', new File([validPdfBlob], 'student-id.pdf', { type: 'application/pdf' }));
      formData.append('paymentProof', new File([validPngBlob], 'payment-receipt.png', { type: 'image/png' }));

      const res = await submitPublicIndividualRegistrationAction({}, formData);

      const dbReg = await prisma.registration.findFirst({
        where: {
          eventId: event.id,
          participant: { email: adminEmail },
        },
        include: { evidence: true },
      });

      if (dbReg) {
        cleanupRegistrationIds.push(dbReg.id);
        if (dbReg.participantId) cleanupParticipantIds.push(dbReg.participantId);
      }

      const passed =
        Boolean(res.success?.includes('Admin review')) &&
        Boolean(dbReg) &&
        dbReg?.ambassadorId === null &&
        dbReg?.reviewStatus === 'PENDING_ADMIN' &&
        dbReg?.source === 'PUBLIC' &&
        dbReg?.evidence.length === 2 &&
        dbReg?.evidence.some((e) => e.type === 'STUDENT_DOCUMENT') &&
        dbReg?.evidence.some((e) => e.type === 'PAYMENT_PROOF');

      results.push({
        name: 'No Ambassador: Submits with payment proof, queued to Admin (PENDING_ADMIN with 2 evidence files)',
        passed,
        details: passed ? 'Queued to admin successfully' : JSON.stringify({ res, dbReg }),
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Fatal Test Suite Execution Failure',
      passed: false,
      details: err?.message || String(err),
    });
  } finally {
    // Clean up created test entities
    if (cleanupRegistrationIds.length > 0) {
      await prisma.registrationEvidence.deleteMany({
        where: { registrationId: { in: cleanupRegistrationIds } },
      });
      await prisma.registration.deleteMany({
        where: { id: { in: cleanupRegistrationIds } },
      });
    }
    if (cleanupParticipantIds.length > 0) {
      await prisma.participant.deleteMany({
        where: { id: { in: cleanupParticipantIds } },
      });
    }
    await prisma.$disconnect();
  }

  const allPassed = printTestSummary(results);
  if (!allPassed) {
    process.exit(1);
  }
}

runPublicRegistrationTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
