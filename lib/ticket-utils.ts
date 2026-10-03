export function getTicketDisplayStatus(
  ticket: {
    status: string;
    registration: {
      event: {
        deadline: Date;
      };
    };
  },
  now = new Date()
): string {
  if (
    ticket.status === 'VALID' &&
    new Date(ticket.registration.event.deadline) < now
  ) {
    return 'EXPIRED';
  }

  return ticket.status;
}
