import { registerParticipantAction } from '@/app/(dashboard)/ambassador/actions';
import { Button } from '@/components/ui/Button';

export function AmbassadorRegisterForm({
  eventId,
}: {
  eventId: string;
}) {
  return (
    <form
      action={registerParticipantAction}
      className="mt-4 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-divider)] p-5 bg-[var(--color-surface)]"
    >
      <input
        type="hidden"
        name="eventId"
        value={eventId}
      />

      <div>
        <label className="form-label">
          Participant Email
        </label>

        <input
          name="participantEmail"
          type="email"
          required
          placeholder="participant@example.com"
          className="form-input"
        />

        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          The participant must already have a KISHWAR account.
        </p>
      </div>

      <div>
        <label className="form-label">
          Participant CNIC
        </label>

        <input
          name="participantCnic"
          type="text"
          required
          placeholder="35202-1234567-1"
          className="form-input"
        />

        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          CNIC must match the participant&apos;s account.
        </p>
      </div>

      <Button type="submit" variant="primary" className="w-full mt-2">
        Register Participant
      </Button>
    </form>
  );
}
