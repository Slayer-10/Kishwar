import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CancelRegistrationButton } from '@/components/dashboard/cancel-registration-button';

export default async function ParticipantHomePage() {
  const user = await getCurrentUser();

  const registrations = await prisma.registration.findMany({
    where: { participantId: user!.participant!.id },
    include: { event: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Registrations</h1>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Event</th>
            <th className="p-2">Status</th>
            <th className="p-2">Event Date</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">
                <Link href={`/events/${r.eventId}`} className="text-blue-600 underline">
                  {r.event.name}
                </Link>
              </td>
              <td className="p-2">{r.status}</td>
              <td className="p-2">{r.event.eventDate.toLocaleString()}</td>
              <td className="p-2">
                {r.status === 'PENDING' && <CancelRegistrationButton registrationId={r.id} />}
              </td>
            </tr>
          ))}
          {registrations.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-slate-500">
                You haven't registered for any events yet.{' '}
                <Link href="/events" className="text-blue-600 underline">Browse events</Link>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
