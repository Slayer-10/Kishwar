import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { spaceGrotesk } from '@/lib/fonts';
import { getCurrentUser } from '@/lib/auth';
import { AmbassadorRegisterForm } from '@/components/public/ambassador-register-form';
import { AmbassadorTeamRegisterForm } from '@/components/public/ambassador-team-register-form';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'border-[#E8A33D] text-[#E8A33D]',
  CLOSED: 'border-[#2A2E3A] text-[#C9C6BD]',
  COMPLETED: 'border-[#2A2E3A] text-[#C9C6BD]',
};

export default async function PublicEventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
  });

  if (!event || event.status === 'DRAFT' || event.status === 'CANCELLED') {
    notFound();
  }

  return (
    <div className="bg-[#12141C] text-[#F2F0EA]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/events"
          className="text-sm text-[#C9C6BD] transition-colors duration-150 hover:text-[#E8A33D]"
        >
          ← Back to Events
        </Link>

        <div className="mt-6 flex items-start justify-between gap-4">
          <h1
            className={`${spaceGrotesk.className} text-3xl font-bold md:text-4xl`}
          >
            {event.name}
          </h1>

          <span
            className={`shrink-0 rounded-sm border px-3 py-1 text-xs font-medium ${
              STATUS_STYLES[event.status] ??
              'border-[#2A2E3A] text-[#C9C6BD]'
            }`}
          >
            {event.status}
          </span>
        </div>

        {event.category && (
          <p className="mt-2 text-sm uppercase tracking-widest text-[#E8A33D]">
            {event.category}
          </p>
        )}

        {event.description && (
          <p className="mt-6 text-base leading-relaxed text-[#C9C6BD]">
            {event.description}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 rounded-sm border border-[#2A2E3A] p-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[#C9C6BD]">Registration Fee</p>
            <p className="mt-1 font-medium text-[#F2F0EA]">
              PKR {event.registrationFee.toString()}
            </p>
          </div>

          {event.prizeMoney && (
            <div>
              <p className="text-[#C9C6BD]">Prize Money</p>
              <p className="mt-1 font-medium text-[#F2F0EA]">
                PKR {event.prizeMoney.toString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-[#C9C6BD]">Registration Type</p>
            <p className="mt-1 font-medium text-[#F2F0EA]">
              {event.registrationType}
            </p>
          </div>

          {(event.minTeamSize || event.maxTeamSize) && (
            <div>
              <p className="text-[#C9C6BD]">Team Size</p>
              <p className="mt-1 font-medium text-[#F2F0EA]">
                {event.minTeamSize}–{event.maxTeamSize}
              </p>
            </div>
          )}

          <div>
            <p className="text-[#C9C6BD]">Registration Deadline</p>
            <p className="mt-1 font-medium text-[#F2F0EA]">
              {event.deadline.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-[#C9C6BD]">Event Date</p>
            <p className="mt-1 font-medium text-[#F2F0EA]">
              {event.eventDate.toLocaleString()}
            </p>
          </div>

          {event.venue && (
            <div>
              <p className="text-[#C9C6BD]">Venue</p>
              <p className="mt-1 font-medium text-[#F2F0EA]">
                {event.venue}
              </p>
            </div>
          )}
        </div>

        {event.rules && (
          <div className="mt-10">
            <h2
              className={`${spaceGrotesk.className} text-lg font-bold text-[#F2F0EA]`}
            >
              Rules
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#C9C6BD]">
              {event.rules}
            </p>
          </div>
        )}

        {event.status === 'OPEN' && (
          <div className="mt-10 rounded-sm border border-[#2A2E3A] p-6">
            <h2 className="text-lg font-semibold">Registration</h2>

            {!user && (
              <>
                <p className="mt-2 text-sm leading-relaxed text-[#C9C6BD]">
                  Log in to continue with event registration.
                </p>

                <Link
                  href="/login"
                  className="mt-5 inline-block rounded-sm bg-[#E8A33D] px-5 py-3 text-sm font-medium text-[#12141C]"
                >
                  Login to Register
                </Link>
              </>
            )}

            {user?.role === 'PARTICIPANT' && (
              <>
                <p className="mt-2 text-sm leading-relaxed text-[#C9C6BD]">
                  Event registration is handled by authorized KISHWAR Ambassadors.
                </p>

                <Link
                  href="/participant/ambassador-application"
                  className="mt-5 inline-block rounded-sm bg-[#E8A33D] px-5 py-3 text-sm font-medium text-[#12141C]"
                >
                  Ask Ambassador to Register / Become an Ambassador
                </Link>
              </>
            )}

            {user?.role === 'AMBASSADOR' && (
              <>
                {event.registrationType !== 'TEAM' && (
                  <AmbassadorRegisterForm eventId={event.id} />
                )}

                {event.registrationType !== 'INDIVIDUAL' && (
                  <AmbassadorTeamRegisterForm
                    eventId={event.id}
                    minTeamSize={event.minTeamSize}
                    maxTeamSize={event.maxTeamSize}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
