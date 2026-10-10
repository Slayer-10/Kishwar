'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ambassadorInvoiceScope, PAYABLE_INVOICE_FILTER } from '@/lib/ambassador-scope';

async function requireAmbassador() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.ambassador) {
    redirect('/login');
  }

  if (!user.participant) {
    const participant = await prisma.participant.create({
      data: {
        userId: user.id,
        fullName: user.email.split('@')[0],
        email: user.email,
      },
    });
    return { ...user, participant };
  }

  return user as typeof user & { participant: NonNullable<typeof user.participant> };
}

export async function registerParticipantAction(formData: FormData) {
  const user = await requireAmbassador();

  const eventId = String(formData.get('eventId') ?? '').trim();
  const participantEmail = String(
    formData.get('participantEmail') ?? ''
  ).trim().toLowerCase();
  const participantCnic = String(
    formData.get('participantCnic') ?? ''
  ).trim();

  if (!eventId || !participantEmail) {
    throw new Error('Event and participant email are required.');
  }

  const cleanInputCnic = participantCnic.replaceAll('-', '').trim();
  if (!cleanInputCnic) {
    throw new Error('Participant CNIC is required.');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found.');
  }

  if (event.status !== 'OPEN') {
    throw new Error('This event is not open for registration.');
  }

  if (event.deadline < new Date()) {
    throw new Error('The registration deadline has passed.');
  }

  if (event.registrationType === 'TEAM') {
    throw new Error('This event only accepts team registration.');
  }

  const participant = await prisma.participant.findUnique({
    where: { email: participantEmail },
  });

  if (!participant) {
    throw new Error(
      'No KISHWAR participant account exists with this email. The participant must create an account first.'
    );
  }

  const cleanStoredCnic = participant.cnic
    ? participant.cnic.replaceAll('-', '').trim()
    : '';

  if (cleanStoredCnic && cleanStoredCnic.toLowerCase() !== cleanInputCnic.toLowerCase()) {
    throw new Error("The entered CNIC does not match this participant's account.");
  }

  if (!cleanStoredCnic) {
    await prisma.participant.update({
      where: { id: participant.id },
      data: { cnic: participantCnic.trim() },
    });
  }

  const existing = await prisma.registration.findFirst({
    where: {
      eventId,
      participantId: participant.id,
    },
  });

  if (existing) {
    throw new Error('This participant is already registered for this event.');
  }

  const registration = await prisma.registration.create({
    data: {
      eventId,
      participantId: participant.id,
      ambassadorId: user.ambassador!.id,
    },
  });

  await prisma.invoice.create({
    data: {
      registrationId: registration.id,
      invoiceNumber: `INV-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`,
      amount: event.registrationFee,
    },
  });

  revalidatePath('/ambassador');
  revalidatePath('/ambassador/participants');
}

export async function registerTeamAction(formData: FormData) {
  const user = await requireAmbassador();

  const eventId = String(formData.get('eventId') ?? '').trim();
  const teamName = String(formData.get('teamName') ?? '').trim();

  const captainEmail = String(
    formData.get('captainEmail') ?? ''
  ).trim().toLowerCase();
  const captainCnic = String(
    formData.get('captainCnic') ?? ''
  ).trim();

  const memberEmails = formData
    .getAll('memberEmails')
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);

  const memberCnics = formData
    .getAll('memberCnics')
    .map((value) => String(value).trim());

  if (!eventId || !teamName || !captainEmail) {
    throw new Error(
      'Event, team name, and captain email are required.'
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found.');
  }

  if (event.status !== 'OPEN') {
    throw new Error('This event is not open for registration.');
  }

  if (event.deadline < new Date()) {
    throw new Error('The registration deadline has passed.');
  }

  if (event.registrationType === 'INDIVIDUAL') {
    throw new Error('This event only accepts individual registration.');
  }

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user.ambassador!.id },
  });

  if (!ambassador) {
    throw new Error('Ambassador record not found.');
  }

  const captain = await prisma.participant.findUnique({
    where: { email: captainEmail },
  });

  if (!captain) {
    throw new Error(
      'The captain must already have a KISHWAR participant account.'
    );
  }

  const uniqueEmails = [
    captainEmail,
    ...memberEmails.filter((email) => email !== captainEmail),
  ];

  const participants = await prisma.participant.findMany({
    where: {
      email: {
        in: uniqueEmails,
      },
    },
  });

  if (participants.length !== uniqueEmails.length) {
    throw new Error(
      'One or more participants do not have KISHWAR accounts. Every team member must already have an account.'
    );
  }

  // Create a mapping of email to submitted CNIC
  const cnicMap = new Map<string, string>();
  cnicMap.set(captainEmail, captainCnic);
  for (let i = 0; i < memberEmails.length; i++) {
    if (memberEmails[i] && memberCnics[i]) {
      cnicMap.set(memberEmails[i], memberCnics[i]);
    }
  }

  // Process CNIC validation & first-time persistence for every team member
  for (const p of participants) {
    const submittedCnic = cnicMap.get(p.email.toLowerCase()) ?? '';
    const cleanInput = submittedCnic.replaceAll('-', '').trim();
    const cleanStored = p.cnic ? p.cnic.replaceAll('-', '').trim() : '';

    if (cleanStored) {
      if (cleanInput && cleanStored.toLowerCase() !== cleanInput.toLowerCase()) {
        throw new Error(
          `The entered CNIC for ${p.fullName} (${p.email}) does not match their account.`
        );
      }
    } else {
      if (!cleanInput) {
        throw new Error(
          `Participant CNIC is required. Team member ${p.fullName} (${p.email}) is missing CNIC.`
        );
      }
      // Save first-time CNIC
      await prisma.participant.update({
        where: { id: p.id },
        data: { cnic: submittedCnic.trim() },
      });
    }
  }

  const participantMap = new Map(
    participants.map((participant) => [
      participant.email.toLowerCase(),
      participant,
    ])
  );

  const captainRecord = participantMap.get(captainEmail);

  if (!captainRecord) {
    throw new Error('Captain account not found.');
  }

  const allParticipantIds = uniqueEmails.map(
    (email) => participantMap.get(email)!.id
  );

  if (
    event.minTeamSize &&
    allParticipantIds.length < event.minTeamSize
  ) {
    throw new Error(
      `This event requires at least ${event.minTeamSize} team members.`
    );
  }

  if (
    event.maxTeamSize &&
    allParticipantIds.length > event.maxTeamSize
  ) {
    throw new Error(
      `This event allows at most ${event.maxTeamSize} team members.`
    );
  }

  const conflictingRegistration =
    await prisma.registration.findFirst({
      where: {
        eventId,
        OR: [
          {
            participantId: {
              in: allParticipantIds,
            },
          },
          {
            team: {
              captainId: {
                in: allParticipantIds,
              },
            },
          },
          {
            team: {
              members: {
                some: {
                  participantId: {
                    in: allParticipantIds,
                  },
                },
              },
            },
          },
        ],
      },
    });

  if (conflictingRegistration) {
    throw new Error(
      'One or more team members are already registered for this event.'
    );
  }

  const team = await prisma.team.create({
    data: {
      name: teamName,
      captainId: captainRecord.id,
      eventId,
      universityId: ambassador.universityId,
      ambassadorId: ambassador.id,
      members: {
        create: allParticipantIds.map((participantId) => ({
          participantId,
        })),
      },
    },
  });

  const registration = await prisma.registration.create({
    data: {
      eventId,
      teamId: team.id,
      ambassadorId: ambassador.id,
    },
  });

  await prisma.invoice.create({
    data: {
      registrationId: registration.id,
      invoiceNumber: `INV-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`,
      amount: event.registrationFee,
    },
  });

  revalidatePath('/ambassador');
  revalidatePath('/ambassador/participants');

  redirect('/ambassador');
}

export async function registerSelfAction(formData: FormData) {
  const user = await requireAmbassador();

  const eventId = String(formData.get('eventId') ?? '').trim();
  const participantCnic = String(formData.get('participantCnic') ?? '').trim();

  if (!eventId) {
    throw new Error('Event ID is required.');
  }

  const cleanInputCnic = participantCnic.replaceAll('-', '').trim();
  if (!cleanInputCnic) {
    throw new Error('Participant CNIC is required.');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found.');
  }

  if (event.status !== 'OPEN') {
    throw new Error('This event is not open for registration.');
  }

  if (event.deadline < new Date()) {
    throw new Error('The registration deadline has passed.');
  }

  if (event.registrationType === 'TEAM') {
    throw new Error('This event only accepts team registration.');
  }

  const participant = user.participant!;
  const cleanStoredCnic = participant.cnic
    ? participant.cnic.replaceAll('-', '').trim()
    : '';

  if (cleanStoredCnic && cleanStoredCnic.toLowerCase() !== cleanInputCnic.toLowerCase()) {
    throw new Error('The entered CNIC does not match your participant account.');
  }

  if (!cleanStoredCnic) {
    await prisma.participant.update({
      where: { id: participant.id },
      data: { cnic: participantCnic.trim() },
    });
  }

  const existing = await prisma.registration.findFirst({
    where: {
      eventId,
      participantId: participant.id,
    },
  });

  if (existing) {
    throw new Error('You are already registered for this event.');
  }

  const registration = await prisma.registration.create({
    data: {
      eventId,
      participantId: participant.id,
      ambassadorId: user.ambassador!.id,
    },
  });

  await prisma.invoice.create({
    data: {
      registrationId: registration.id,
      invoiceNumber: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
      amount: event.registrationFee,
    },
  });

  revalidatePath('/ambassador');
  revalidatePath('/ambassador/payments');
  revalidatePath(`/events/${eventId}`);

  redirect('/ambassador');
}

export async function submitBatchPaymentAction(formData: FormData) {
  const user = await requireAmbassador();

  const fail = (message: string): never =>
    redirect(`/ambassador/payments?error=${encodeURIComponent(message)}`);

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user.ambassador!.id },
  });
  if (!ambassador) fail('Ambassador record not found.');

  const invoiceIds = Array.from(
    new Set(
      formData
        .getAll('invoiceIds')
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  );
  const method = String(formData.get('method') ?? '').trim();
  const referenceNumber = String(formData.get('referenceNumber') ?? '').trim();
  const proofUrl = String(formData.get('proofUrl') ?? '').trim() || null;
  const expectedTotal = String(formData.get('expectedTotal') ?? '').trim();

  if (invoiceIds.length === 0) fail('There are no invoices to pay.');
  if (!method) fail('Payment method is required.');
  if (!referenceNumber) fail('Reference number is required.');

  const invoices = await prisma.invoice.findMany({
    where: {
      AND: [
        { id: { in: invoiceIds } },
        ambassadorInvoiceScope(ambassador!, user.participant?.id),
        PAYABLE_INVOICE_FILTER,
      ],
    },
  });

  if (invoices.length !== invoiceIds.length) {
    fail('The invoice list changed. Please review the updated list and try again.');
  }

  const total = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  if (total.toFixed(2) !== Number(expectedTotal).toFixed(2)) {
    fail('The total changed. Please review the updated total and try again.');
  }

  const batchId = randomUUID();

  await prisma.payment.createMany({
    data: invoices.map((inv) => ({
      invoiceId: inv.id,
      amount: inv.amount,
      method,
      referenceNumber,
      proofUrl,
      batchId,
    })),
  });

  revalidatePath('/ambassador');
  revalidatePath('/ambassador/payments');
  revalidatePath('/admin/payments');

  redirect('/ambassador/payments');
}

export async function submitCampusPaymentAction(formData: FormData) {
  const user = await requireAmbassador();

  const fail = (message: string): never =>
    redirect(`/ambassador/payments?error=${encodeURIComponent(message)}`);

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user.ambassador!.id },
  });
  if (!ambassador) fail('Ambassador record not found.');

  const method = String(formData.get('method') ?? '').trim();
  const referenceNumber = String(formData.get('referenceNumber') ?? '').trim();
  const proofUrl = String(formData.get('proofUrl') ?? '').trim() || null;

  if (!method) fail('Payment method is required.');

  // Find all unpaid invoices for this ambassador's campus scope that are PENDING and not linked to a CampusPayment
  const campusScopeWhere = {
    OR: [
      { ambassadorId: ambassador!.id },
      { team: { ambassadorId: ambassador!.id } },
      { participant: { universityId: ambassador!.universityId } },
      { team: { universityId: ambassador!.universityId } },
    ],
  };

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PENDING',
      campusPaymentId: null,
      registration: campusScopeWhere,
    },
  });

  if (unpaidInvoices.length === 0) {
    fail('No unpaid invoices found for your campus.');
  }

  // Calculate total on SERVER from DB
  const totalAmount = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  await prisma.$transaction(async (tx) => {
    const campusPayment = await tx.campusPayment.create({
      data: {
        ambassadorId: ambassador!.id,
        totalAmount,
        method,
        referenceNumber: referenceNumber || null,
        proofUrl,
        verificationStatus: 'SUBMITTED',
      },
    });

    await tx.invoice.updateMany({
      where: {
        id: { in: unpaidInvoices.map((inv) => inv.id) },
      },
      data: {
        campusPaymentId: campusPayment.id,
      },
    });
  });

  revalidatePath('/ambassador/payments');
  revalidatePath('/admin/payments');

  redirect('/ambassador/payments');
}
