import { prisma } from '@/lib/prisma';
import {
  approveAmbassadorRequestAction,
  rejectAmbassadorRequestAction,
} from '../actions';

export default async function AmbassadorRequestsPage() {
  const [requests, universities] = await Promise.all([
    prisma.ambassadorRequest.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        participant: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.university.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">
        Ambassador Requests
      </h1>

      <p className="mb-6 text-sm text-slate-500">
        Review participant requests and assign an approved Ambassador
        to a university.
      </p>

      <div className="space-y-6">
        {requests.map((request) => (
          <div
            key={request.id}
            className="rounded border p-6"
          >
            <div>
              <p className="font-semibold">
                {request.participant.fullName}
              </p>

              <p className="text-sm text-slate-500">
                {request.participant.email}
              </p>

              {request.message && (
                <p className="mt-3 text-sm">
                  {request.message}
                </p>
              )}
            </div>

            <form
              action={approveAmbassadorRequestAction}
              className="mt-5 flex max-w-xl flex-col gap-3"
            >
              <input
                type="hidden"
                name="requestId"
                value={request.id}
              />

              <select
                name="universityId"
                required
                className="rounded border p-2"
              >
                <option value="">
                  Select University
                </option>

                {universities.map((university) => (
                  <option
                    key={university.id}
                    value={university.id}
                  >
                    {university.name}
                    {university.city
                      ? ` (${university.city})`
                      : ''}
                  </option>
                ))}
              </select>

              <input
                name="ambassadorCode"
                required
                placeholder="Ambassador Code"
                className="rounded border p-2"
              />

              <button
                type="submit"
                className="w-fit rounded bg-green-700 px-4 py-2 text-white"
              >
                Approve Ambassador
              </button>
            </form>

            <form
              action={rejectAmbassadorRequestAction}
              className="mt-3"
            >
              <input
                type="hidden"
                name="requestId"
                value={request.id}
              />

              <button
                type="submit"
                className="rounded bg-red-700 px-4 py-2 text-white"
              >
                Reject Request
              </button>
            </form>
          </div>
        ))}

        {requests.length === 0 && (
          <p className="text-slate-500">
            No pending Ambassador requests.
          </p>
        )}
      </div>
    </div>
  );
}
