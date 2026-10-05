import { registerSelfAction } from '@/app/(dashboard)/ambassador/actions';
import { Button } from '@/components/ui/Button';

export function AmbassadorSelfRegisterForm({
  eventId,
}: {
  eventId: string;
}) {
  return (
    <form
      action={registerSelfAction}
      className="mt-4 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-5"
    >
      <input type="hidden" name="eventId" value={eventId} />

      <p
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}
        className="text-base font-bold uppercase"
      >
        Register Yourself as a Participant
      </p>

      <div>
        <label className="form-label">
          Your CNIC
        </label>

        <input
          name="participantCnic"
          type="text"
          required
          placeholder="35202-1234567-1"
          className="form-input"
        />

        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          As an Ambassador, you can participate in this event.
        </p>
      </div>

      <Button type="submit" variant="primary" className="w-full mt-2">
        Register Myself
      </Button>
    </form>
  );
}
