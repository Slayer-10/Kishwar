import type { Prisma } from '@prisma/client';

/** Invoices an ambassador is responsible for paying (his campus + his own). */
export function ambassadorInvoiceScope(
  amb: { id: string; universityId: string },
  ownParticipantId?: string | null
): Prisma.InvoiceWhereInput {
  const or: Prisma.RegistrationWhereInput[] = [
    { ambassadorId: amb.id },
    { participant: { universityId: amb.universityId } },
    { team: { universityId: amb.universityId } },
  ];

  if (ownParticipantId) {
    or.push(
      { participantId: ownParticipantId },
      { team: { captainId: ownParticipantId } },
      { team: { members: { some: { participantId: ownParticipantId } } } }
    );
  }

  return { registration: { OR: or } };
}

/** Invoice still needs payment and has no payment waiting for admin. */
export const PAYABLE_INVOICE_FILTER: Prisma.InvoiceWhereInput = {
  status: 'PENDING',
  payments: { none: { verificationStatus: 'SUBMITTED' } },
};
