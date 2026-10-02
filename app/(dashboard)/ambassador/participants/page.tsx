import { prisma } from '@/lib/prisma';
import { registerParticipantAction, registerTeamAction } from '../actions';

export default async function AmbassadorParticipantsPage() {
  const [events, participants] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: 'OPEN',
        deadline: {
          gte: new Date(),
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    }),
    prisma.participant.findMany({
      orderBy: {
        fullName: 'asc',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Register Participants</h1>
        <p className="mt-1 text-sm text-slate-500">
          Only existing KISHWAR participant accounts can be registered.
        </p>
      </div>

      <section className="rounded border p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Individual Registration
        </h2>

        <form
          action={registerParticipantAction}
          className="flex max-w-xl flex-col gap-4"
        >
          <select
            name="eventId"
            required
            className="rounded border p-2"
          >
            <option value="">Select Event</option>
            {events
              .filter((event) => event.registrationType !== 'TEAM')
              .map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} — PKR {event.registrationFee.toString()}
                </option>
              ))}
          </select>

          <input
            name="participantEmail"
            type="email"
            list="participant-emails"
            placeholder="Participant KISHWAR account email"
            required
            className="rounded border p-2"
          />

          <datalist id="participant-emails">
            {participants.map((participant) => (
              <option
                key={participant.id}
                value={participant.email}
              >
                {participant.fullName}
              </option>
            ))}
          </datalist>

          <button
            type="submit"
            className="w-fit rounded bg-slate-900 px-4 py-2 text-white"
          >
            Register Participant
          </button>
        </form>
      </section>

      <section className="rounded border p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Team Registration
        </h2>

        <form
          action={registerTeamAction}
          className="flex max-w-xl flex-col gap-4"
        >
          <select
            name="eventId"
            required
            className="rounded border p-2"
          >
            <option value="">Select Team Event</option>
            {events
              .filter((event) => event.registrationType !== 'INDIVIDUAL')
              .map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} — PKR {event.registrationFee.toString()}
                </option>
              ))}
          </select>

          <input
            name="teamName"
            placeholder="Team name"
            required
            className="rounded border p-2"
          />

          <input
            name="captainEmail"
            type="email"
            list="participant-emails"
            placeholder="Captain email"
            required
            className="rounded border p-2"
          />

          <p className="text-sm text-slate-500">
            Add the remaining team members below. Every member must
            already have a KISHWAR account.
          </p>

          <input
            name="memberEmails"
            type="email"
            list="participant-emails"
            placeholder="Member 2 email"
            className="rounded border p-2"
          />

          <input
            name="memberEmails"
            type="email"
            list="participant-emails"
            placeholder="Member 3 email"
            className="rounded border p-2"
          />

          <input
            name="memberEmails"
            type="email"
            list="participant-emails"
            placeholder="Member 4 email"
            className="rounded border p-2"
          />

          <button
            type="submit"
            className="w-fit rounded bg-slate-900 px-4 py-2 text-white"
          >
            Register Team
          </button>
        </form>
      </section>
    </div>
  );
}
