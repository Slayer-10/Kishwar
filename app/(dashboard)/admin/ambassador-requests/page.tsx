import React from 'react';
import { prisma } from '@/lib/prisma';
import {
  approveAmbassadorRequestAction,
  rejectAmbassadorRequestAction,
} from '../actions';
import { Button } from '@/components/ui/Button';

export const dynamic = "force-dynamic";

export const dynamic = 'force-dynamic';

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--fs-title1)',
            lineHeight: 'var(--lh-title1)',
            color: 'var(--color-text)',
          }}
          className="font-bold uppercase tracking-tight"
        >
          Ambassador Requests
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Review participant requests and assign an approved Ambassador to a university.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {requests.map((request) => {
          const fullName = request.participant?.fullName ?? request.fullName ?? 'Applicant';
          const email = request.participant?.email ?? request.email ?? '—';
          const phone = request.participant?.phone ?? request.phone ?? '—';
          const cnic = request.participant?.cnic ?? request.cnic ?? '—';

          return (
            <div
              key={request.id}
              className="p-6 md:p-8 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-6 border-t-4"
              style={{ borderTopColor: 'var(--color-primary)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-divider)] pb-4">
                <div>
                  <h2
                    style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                    className="font-bold text-[var(--color-text)]"
                  >
                    {fullName}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                    <span>{email}</span>
                    {!request.participant && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                        Public Applicant
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-medium">
                  Applied: {request.createdAt.toLocaleDateString()}{' '}
                  {request.createdAt.toLocaleTimeString()}
                </span>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Phone</p>
                  <p className="font-semibold text-[var(--color-text)]">{phone}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">CNIC</p>
                  <p className="font-semibold text-[var(--color-text)]">{cnic}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Selected University</p>
                  <p className="font-semibold text-[var(--color-text)]">{request.university?.name ?? '—'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Occupation</p>
                  <p className="font-semibold text-[var(--color-text)]">{request.occupation ?? '—'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Gender</p>
                  <p className="font-semibold text-[var(--color-text)]">{request.gender ?? '—'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Degree / Semester</p>
                  <p className="font-semibold text-[var(--color-text)]">
                    {request.degree ? `${request.degree} (Sem ${request.semester ?? 'N/A'})` : '—'}
                  </p>
                </div>
              </div>

              {request.studentCardUrl && (
                <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-divider)]">
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                    Student Card Verification
                  </p>
                  <div className="mt-2">
                    <a
                      href={request.studentCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      View Full Student Card Image ↗
                    </a>
                  </div>
                </div>
              )}

              {request.message && (
                <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-divider)]">
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                    Applicant Message
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{request.message}</p>
                </div>
              )}

              {/* Review Actions */}
              <div className="pt-4 border-t border-[var(--color-divider)] flex flex-col gap-4">
                <h3
                  style={{ fontFamily: 'var(--font-heading)' }}
                  className="text-base font-bold uppercase text-[var(--color-text)]"
                >
                  Review Action
                </h3>

                <form
                  action={approveAmbassadorRequestAction}
                  className="flex max-w-xl flex-col gap-4 p-5 rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-background)]"
                >
                  <input type="hidden" name="requestId" value={request.id} />

                  <div>
                    <label className="form-label">Assign University</label>
                    <select
                      name="universityId"
                      required
                      defaultValue={request.universityId ?? ''}
                      className="form-input"
                    >
                      <option value="">Select University</option>
                      {universities.map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.name}
                          {university.city ? ` (${university.city})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Ambassador Code</label>
                    <input
                      name="ambassadorCode"
                      required
                      placeholder="e.g. AMB-FAST-001"
                      className="form-input"
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <Button type="submit" variant="success" size="sm">
                      Approve Ambassador
                    </Button>
                  </div>
                </form>

                <form action={rejectAmbassadorRequestAction} className="mt-1">
                  <input type="hidden" name="requestId" value={request.id} />
                  <Button type="submit" variant="danger" size="sm">
                    Reject Request
                  </Button>
                </form>
              </div>
            </div>
          );
        })}

        {requests.length === 0 && (
          <p className="text-center py-12 text-[var(--color-text-muted)]">
            No pending Ambassador requests.
          </p>
        )}
      </div>
    </div>
  );
}
