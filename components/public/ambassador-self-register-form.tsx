import { registerSelfAction } from '@/app/(dashboard)/ambassador/actions';

export function AmbassadorSelfRegisterForm({
  eventId,
}: {
  eventId: string;
}) {
  return (
    <form
      action={registerSelfAction}
      className="mt-5 flex flex-col gap-3 rounded-sm border border-[#E8A33D]/40 bg-[#E8A33D]/5 p-5"
    >
      <input type="hidden" name="eventId" value={eventId} />

      <p className="text-sm font-semibold text-[#E8A33D]">
        Register Yourself as a Participant
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
          Your CNIC
        </label>

        <input
          name="participantCnic"
          type="text"
          required
          placeholder="35202-1234567-1"
          className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
        />

        <p className="mt-1 text-xs text-[#C9C6BD]">
          As an Ambassador, you can participate in this event.
        </p>
      </div>

      <button
        type="submit"
        className="mt-1 self-start rounded-sm bg-[#E8A33D] px-4 py-2 text-sm font-medium text-[#12141C]"
      >
        Register Myself
      </button>
    </form>
  );
}
