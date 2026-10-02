import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requestAmbassadorAction } from './actions';
import { CancelRegistrationButton } from '@/components/dashboard/cancel-registration-button';

export default async function ParticipantHomePage() {
  const user = await getCurrentUser();

  const [registrations, ambassadorRequest] = await Promise.all([
    prisma.registration.findMany({
      where: {
        OR: [
          { participantId: user!.participant!.id },
          {
            team: {
              members: {
                some: {
                  participantId: user!.participant!.id,
                },
              },
            },
          },
        ],
      },
      include: {
        event: true,
        ambassador: {
          include: {
            user: true,
            university: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),

    prisma.ambassadorRequest.findFirst({
      where: {
        participantId: user!.participant!.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-2 text-2xl font-bold">My Account</h1>
        <p className="text-sm text-slate-500">
          {user!.participant!.fullName}
        </p>
      </section>

      <section className="rounded border p-6">
        <h2 className="text-lg font-semibold">
          Become a KISHWAR Ambassador
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Ambassadors are authorized to register participants and teams
          for KISHWAR events.
        </p>

        {!ambassadorRequest && (
          <form action={requestAmbassadorAction} className="mt-4">
            <textarea
              name="message"
              placeholder="Optional message for the Super Admin"
              className="mb-3 w-full rounded border p-2"
              rows={3}
            />

            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-white"
            >
              Request Ambassador Status
            </button>
          </form>
        )}

        {ambassadorRequest?.status === 'PENDING' && (
          <p className="mt-4 text-sm text-amber-700">
            Your Ambassador request is pending Super Admin review.
          </p>
        )}

        {ambassadorRequest?.status === 'REJECTED' && (
          <p className="mt-4 text-sm text-red-700">
            Your previous Ambassador request was rejected. You may submit
            a new request.
          </p>
        )}

        {ambassadorRequest?.status === 'APPROVED' && (
          <p className="mt-4 text-sm text-green-700">
            Your Ambassador request was approved.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-6 text-xl font-bold">My Registrations</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Event</th>
              <th className="p-2">Status</th>
              <th className="p-2">Ambassador</th>
              <th className="p-2">University</th>
              <th className="p-2">Event Date</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {registrations.map((registration) => (
              <tr key={registration.id} className="border-b">
                <td className="p-2">
                  <Link
                    href={`/events/${registration.eventId}`}
                    className="text-blue-600 underline"
                  >
                    {registration.event.name}
                  </Link>
                </td>

                <td className="p-2">
                  {registration.status}
                </td>

                <td className="p-2">
                  {registration.ambassador?.user.email ?? 'Direct'}
                </td>

                <td className="p-2">
                  {registration.ambassador?.university.name ?? '—'}
                </td>

                <td className="p-2">
                  {registration.event.eventDate.toLocaleString()}
                </td>

                <td className="p-2">
                  {registration.status === 'PENDING' &&
                    registration.participantId === user!.participant!.id && (
                      <CancelRegistrationButton
                        registrationId={registration.id}
                      />
                    )}
                </td>
              </tr>
            ))}

            {registrations.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-slate-500"
                >
                  No event registrations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
