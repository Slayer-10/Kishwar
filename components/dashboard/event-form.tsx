'use client';

import { useFormState } from 'react-dom';

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
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {state?.error && (
        <div className="rounded bg-red-100 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Event Name</label>
        <input name="name" type="text" required defaultValue={initialValues.name} className="w-full rounded border p-2" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea name="description" defaultValue={initialValues.description} className="w-full rounded border p-2" rows={3} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Category</label>
        <input name="category" type="text" defaultValue={initialValues.category} className="w-full rounded border p-2" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Registration Fee (PKR)</label>
          <input name="registrationFee" type="number" step="0.01" required defaultValue={initialValues.registrationFee} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Prize Money (PKR)</label>
          <input name="prizeMoney" type="number" step="0.01" defaultValue={initialValues.prizeMoney} className="w-full rounded border p-2" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Registration Type</label>
        <select name="registrationType" defaultValue={initialValues.registrationType ?? 'INDIVIDUAL'} className="w-full rounded border p-2">
          <option value="INDIVIDUAL">Individual</option>
          <option value="TEAM">Team</option>
          <option value="BOTH">Both</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Min Team Size</label>
          <input name="minTeamSize" type="number" defaultValue={initialValues.minTeamSize} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Max Team Size</label>
          <input name="maxTeamSize" type="number" defaultValue={initialValues.maxTeamSize} className="w-full rounded border p-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Registration Deadline</label>
          <input name="deadline" type="datetime-local" required defaultValue={initialValues.deadline} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Event Date</label>
          <input name="eventDate" type="datetime-local" required defaultValue={initialValues.eventDate} className="w-full rounded border p-2" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Venue</label>
        <input name="venue" type="text" defaultValue={initialValues.venue} className="w-full rounded border p-2" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Rules</label>
        <textarea name="rules" defaultValue={initialValues.rules} className="w-full rounded border p-2" rows={4} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Status</label>
        <select name="status" defaultValue={initialValues.status ?? 'DRAFT'} className="w-full rounded border p-2">
          <option value="DRAFT">Draft</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <button type="submit" className="rounded bg-slate-900 p-2 text-white">
        {submitLabel}
      </button>
    </form>
  );
}
