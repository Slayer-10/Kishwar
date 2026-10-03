import { registerParticipantAction } from '@/app/(dashboard)/ambassador/actions';

export function AmbassadorRegisterForm({
  eventId,
}: {
  eventId: string;
}) {
  return (
    <form
      action={registerParticipantAction}
      className="mt-5 flex flex-col gap-3 rounded-sm border border-[#2A2E3A] p-5"
    >
      <input
        type="hidden"
        name="eventId"
        value={eventId}
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
          Participant Email
        </label>

        <input
          name="participantEmail"
          type="email"
          required
          placeholder="participant@example.com"
          className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
        />

        <p className="mt-1 text-xs text-[#C9C6BD]">
          The participant must already have a KISHWAR account.
        </p>
      </div>

      <button
        type="submit"
        className="mt-1 self-start rounded-sm bg-[#E8A33D] px-4 py-2 text-sm font-medium text-[#12141C]"
      >
        Register Participant
      </button>
    </form>
  );
}
