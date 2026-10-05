'use client';

import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/Button';

type EventFormState = { error?: string };

type EventFormProps = {
  action: (prevState: EventFormState, formData: FormData) => Promise<EventFormState>;
  submitLabel: string;
  initialValues?: {
    name?: string;
    description?: string;
    category?: string;
    registrationFee?: string;
    prizeMoney?: string;
    registrationType?: string;
    minTeamSize?: string;
    maxTeamSize?: string;
    deadline?: string;
    eventDate?: string;
    venue?: string;
    rules?: string;
    status?: string;
  };
};

const initialState: EventFormState = { error: undefined };

export function EventForm({ action, submitLabel, initialValues = {} }: EventFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form
      action={formAction}
      className="flex max-w-3xl flex-col gap-6 p-8 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
    >
      {state?.error && <div className="form-error">{state.error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Event Name</label>
          <input
            name="name"
            type="text"
            required
            defaultValue={initialValues.name}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Category</label>
          <input
            name="category"
            type="text"
            defaultValue={initialValues.category}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea
          name="description"
          defaultValue={initialValues.description}
          className="form-input !h-auto py-3"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Registration Fee (PKR)</label>
          <input
            name="registrationFee"
            type="number"
            step="0.01"
            required
            defaultValue={initialValues.registrationFee}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Prize Money (PKR)</label>
          <input
            name="prizeMoney"
            type="number"
            step="0.01"
            defaultValue={initialValues.prizeMoney}
            className="form-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Registration Type</label>
          <select
            name="registrationType"
            defaultValue={initialValues.registrationType ?? 'INDIVIDUAL'}
            className="form-input"
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="TEAM">Team</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        <div>
          <label className="form-label">Min Team Size</label>
          <input
            name="minTeamSize"
            type="number"
            defaultValue={initialValues.minTeamSize}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Max Team Size</label>
          <input
            name="maxTeamSize"
            type="number"
            defaultValue={initialValues.maxTeamSize}
            className="form-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Registration Deadline</label>
          <input
            name="deadline"
            type="datetime-local"
            required
            defaultValue={initialValues.deadline}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Event Date</label>
          <input
            name="eventDate"
            type="datetime-local"
            required
            defaultValue={initialValues.eventDate}
            className="form-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Venue</label>
          <input
            name="venue"
            type="text"
            defaultValue={initialValues.venue}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select
            name="status"
            defaultValue={initialValues.status ?? 'DRAFT'}
            className="form-input"
          >
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Rules</label>
        <textarea
          name="rules"
          defaultValue={initialValues.rules}
          className="form-input !h-auto py-3"
          rows={4}
        />
      </div>

      <Button type="submit" variant="primary" className="mt-4 self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
