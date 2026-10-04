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
        university: true,
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
        {requests.map((request) => {
          const fullName = request.participant?.fullName ?? request.fullName ?? 'Applicant';
          const email = request.participant?.email ?? request.email ?? '—';
          const phone = request.participant?.phone ?? request.phone ?? '—';
          const cnic = request.participant?.cnic ?? request.cnic ?? '—';

          return (
            <div
              key={request.id}
              className="rounded border bg-white p-6 shadow-sm"
            >
              <div className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {fullName}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {email} {!request.participant && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 font-normal">Public Applicant</span>}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    Applied: {request.createdAt.toLocaleDateString()} {request.createdAt.toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Application Details */}
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-800">{phone}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">CNIC</p>
                  <p className="font-semibold text-slate-800">{cnic}</p>
                </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Selected University</p>
                <p className="font-semibold text-slate-800">{request.university?.name ?? '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Occupation</p>
                <p className="font-semibold text-slate-800">{request.occupation ?? '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Gender</p>
                <p className="font-semibold text-slate-800">{request.gender ?? '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Degree / Semester</p>
                <p className="font-semibold text-slate-800">
                  {request.degree ? `${request.degree} (Sem ${request.semester ?? 'N/A'})` : '—'}
                </p>
              </div>
            </div>

            {request.studentCardUrl && (
              <div className="mt-4 rounded border bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Student Card Verification</p>
                <div className="mt-2 flex items-center gap-4">
                  <a
                    href={request.studentCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  >
                    View Full Student Card Image ↗
                  </a>
                </div>
              </div>
            )}

            {request.message && (
              <div className="mt-4 rounded bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Applicant Message</p>
                <p className="mt-1 text-sm text-slate-700">{request.message}</p>
              </div>
            )}

            {/* Approval / Rejection Form */}
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Review Action</h3>

              <form
                action={approveAmbassadorRequestAction}
                className="flex max-w-xl flex-col gap-3"
              >
                <input
                  type="hidden"
                  name="requestId"
                  value={request.id}
                />

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Assign University
                  </label>
                  <select
                    name="universityId"
                    required
                    defaultValue={request.universityId ?? ''}
                    className="w-full rounded border p-2 text-sm"
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
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Ambassador Code
                  </label>
                  <input
                    name="ambassadorCode"
                    required
                    placeholder="e.g. AMB-FAST-001"
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                  >
                    Approve Ambassador
                  </button>
                </div>
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
                  className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                >
                  Reject Request
                </button>
              </form>
            </div>
          </div>
        );
        })}

        {requests.length === 0 && (
          <p className="text-slate-500">
            No pending Ambassador requests.
          </p>
        )}
      </div>
    </div>
  );
}
