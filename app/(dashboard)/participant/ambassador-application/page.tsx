import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requestAmbassadorAction } from '../actions';

export default async function AmbassadorApplicationPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'PARTICIPANT' || !user.participant) {
    return null;
  }

  const existingRequest = await prisma.ambassadorRequest.findFirst({
    where: {
      participantId: user.participant.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="max-w-2xl">
      <Link
        href="/events"
        className="text-sm text-slate-500 underline"
      >
        ← Back to KISHWAR Events
      </Link>

      <h1 className="mt-6 text-2xl font-bold">
        Become a KISHWAR Ambassador
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Ambassadors are authorized to register existing KISHWAR
        participants and teams for events.
      </p>

      {existingRequest?.status === 'PENDING' && (
        <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your Ambassador application is currently pending Super Admin review.
        </div>
      )}

      {existingRequest?.status === 'APPROVED' && (
        <div className="mt-6 rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Your Ambassador application has been approved.
          Please log out and log back in to continue as an Ambassador.
        </div>
      )}

      {(!existingRequest || existingRequest.status === 'REJECTED') && (
        <form
          action={requestAmbassadorAction}
          className="mt-8 flex max-w-xl flex-col gap-4"
        >
          {existingRequest?.status === 'REJECTED' && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Your previous Ambassador application was rejected.
              You may submit a new application.
            </div>
          )}

          <div>
            <label
              htmlFor="message"
              className="mb-1 block text-sm font-medium"
            >
              Message
            </label>

            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Tell the Super Admin why you would like to become a KISHWAR Ambassador."
              className="w-full rounded border p-3 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-fit rounded bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Submit Ambassador Application
          </button>
        </form>
      )}
    </div>
  );
}
