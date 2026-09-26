'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function requireFdo() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'FDO') {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function checkInTicketAction(formData: FormData) {
  await requireFdo();

  const ticketCode = String(formData.get('ticketCode') ?? '').trim().toUpperCase();

  if (!ticketCode) {
    redirect('/fdo/checkin?error=Please enter a ticket code.');
  }

  const ticket = await prisma.ticket.findUnique({ where: { ticketCode } });

  if (!ticket) {
    redirect(`/fdo/checkin?error=No ticket found with that code.`);
  }
  if (ticket.status === 'USED') {
    redirect(`/fdo/checkin?code=${ticketCode}&error=This ticket has already been used.`);
  }
  if (ticket.status === 'INVALID') {
    redirect(`/fdo/checkin?code=${ticketCode}&error=This ticket is marked invalid and cannot be checked in.`);
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'USED' },
  });

  revalidatePath('/fdo/checkin');
  redirect(`/fdo/checkin?code=${ticketCode}&success=Checked in successfully.`);
}
