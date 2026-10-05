import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { submitPublicAmbassadorApplication } from './actions';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';

export default async function PublicAmbassadorApplicationPage({
  searchParams,
}: {
  searchParams: { submitted?: string; request?: string; email?: string };
}) {
  const user = await getCurrentUser();

  // If user is already an Ambassador
  if (user?.role === 'AMBASSADOR') {
    return (
      <div className="w-full py-16" style={{ backgroundColor: 'var(--color-background)' }}>
        <Container className="max-w-2xl">
          <div
            className="p-8 rounded-[var(--radius-lg)] border-l-4 flex flex-col gap-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderLeftColor: 'var(--color-success)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <h1
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title1)' }}
              className="font-bold text-[var(--color-text)] uppercase"
            >
              Ambassador Application
            </h1>
            <p className="text-base font-semibold text-[var(--color-success)]">
              Your ambassador application has been approved.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              You are an active Ambassador representing your university.
            </p>
            <div className="pt-2">
              <Button href="/ambassador" variant="primary">
                Go to Ambassador Dashboard →
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Find existing request by ID, participantId, or email
  let existingRequest = null;

  if (searchParams.request) {
    existingRequest = await prisma.ambassadorRequest.findUnique({
      where: { id: searchParams.request },
      include: { university: true },
    });
  } else if (user?.participant) {
    existingRequest = await prisma.ambassadorRequest.findFirst({
      where: {
        OR: [
          { participantId: user.participant.id },
          { email: user.participant.email.toLowerCase() },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { university: true },
    });
  } else if (searchParams.email) {
    existingRequest = await prisma.ambassadorRequest.findFirst({
      where: { email: searchParams.email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      include: { university: true },
    });
  }

  const universities = await prisma.university.findMany({
    orderBy: { name: 'asc' },
  });

  const isPending = existingRequest?.status === 'PENDING' || searchParams.submitted === '1';

  return (
    <div className="w-full py-16" style={{ backgroundColor: 'var(--color-background)' }}>
      <Container className="max-w-2xl">
        <Link
          href="/"
          className="text-xs uppercase font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          ← Back to KISHWAR Home
        </Link>

        <SectionHeading
          eyebrow="Network"
          title="Become a KISHWAR Ambassador"
          subtitle="Campus ambassadors represent partner universities across Pakistan and manage event registrations for their institution."
          className="mt-6 mb-8"
        />

        {isPending && (
          <div
            className="p-6 rounded-[var(--radius-md)] border-l-4 flex flex-col gap-2 text-sm"
            style={{
              backgroundColor: 'rgba(255, 136, 0, 0.08)',
              borderLeftColor: 'var(--color-warning)',
            }}
          >
            <p className="text-base font-bold text-[var(--color-warning)]">
              Application submitted successfully.
            </p>
            <p className="text-[var(--color-text-muted)]">
              Your application is now waiting for review by the KISHWAR administration.
            </p>
            <p className="text-[var(--color-text-muted)]">
              Please wait for an email regarding the result of your application.
            </p>
            {existingRequest?.university && (
              <p className="text-xs text-[var(--color-text-muted)] border-t border-[var(--color-divider)] pt-3 mt-1">
                Applied for: <span className="font-semibold text-[var(--color-text)]">{existingRequest.university.name}</span>
              </p>
            )}
          </div>
        )}

        {existingRequest?.status === 'APPROVED' && !isPending && (
          <div
            className="p-6 rounded-[var(--radius-md)] border-l-4 flex flex-col gap-3 text-sm"
            style={{
              backgroundColor: 'rgba(45, 125, 70, 0.08)',
              borderLeftColor: 'var(--color-success)',
            }}
          >
            <p className="text-base font-bold text-[var(--color-success)]">
              Your ambassador application has been approved.
            </p>
            <p className="text-[var(--color-text-muted)]">
              Please check your email for your Ambassador credentials and login instructions.
            </p>
            <div className="pt-2">
              <Button href="/login" variant="primary">
                Log In Now →
              </Button>
            </div>
          </div>
        )}

        {(!existingRequest || existingRequest.status === 'REJECTED') && !isPending && (
          <form
            action={submitPublicAmbassadorApplication}
            encType="multipart/form-data"
            className="flex flex-col gap-6"
          >
            {existingRequest?.status === 'REJECTED' && (
              <div className="form-error">
                Your previous Ambassador application was rejected. You may submit a new application below.
              </div>
            )}

            {/* Personal Information */}
            <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4">
              <h2
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                className="font-bold text-[var(--color-text)] uppercase"
              >
                Personal Information
              </h2>

              <div>
                <label htmlFor="fullName" className="form-label">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  defaultValue={user?.participant?.fullName ?? ''}
                  placeholder="e.g. Ali Khan"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="email" className="form-label">
                  Email Address *
                </label>
                {user?.participant ? (
                  <>
                    <input type="hidden" name="email" value={user.participant.email} />
                    <input
                      id="email"
                      type="email"
                      disabled
                      value={user.participant.email}
                      className="form-input opacity-70 cursor-not-allowed bg-gray-100"
                    />
                  </>
                ) : (
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="form-input"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="form-label">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="0300-1234567"
                    defaultValue={user?.participant?.phone ?? ''}
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="form-label">
                    Gender *
                  </label>
                  <select id="gender" name="gender" required className="form-input">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="cnic" className="form-label">
                  CNIC Number *
                </label>
                <input
                  id="cnic"
                  name="cnic"
                  type="text"
                  required
                  placeholder="35202-1234567-1"
                  defaultValue={user?.participant?.cnic ?? ''}
                  className="form-input"
                />
              </div>
            </div>

            {/* Academic / Professional Information */}
            <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4">
              <h2
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                className="font-bold text-[var(--color-text)] uppercase"
              >
                Academic / Professional Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="universityId" className="form-label">
                    University *
                  </label>
                  <select id="universityId" name="universityId" required className="form-input">
                    <option value="">Select University</option>
                    {universities.map((uni) => (
                      <option key={uni.id} value={uni.id}>
                        {uni.name} {uni.city ? `(${uni.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="occupation" className="form-label">
                    Occupation *
                  </label>
                  <select id="occupation" name="occupation" required className="form-input">
                    <option value="">Select Occupation</option>
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="degree" className="form-label">
                    Degree / Program *
                  </label>
                  <input
                    id="degree"
                    name="degree"
                    type="text"
                    required
                    placeholder="e.g. BS Computer Science"
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="semester" className="form-label">
                    Semester Number *
                  </label>
                  <input
                    id="semester"
                    name="semester"
                    type="number"
                    min="1"
                    max="20"
                    required
                    placeholder="e.g. 5"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Student Verification */}
            <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-3">
              <h2
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                className="font-bold text-[var(--color-text)] uppercase"
              >
                Student Verification
              </h2>
              <label htmlFor="studentCard" className="form-label">
                Clear picture of Student Card *
              </label>
              <p className="text-xs text-[var(--color-text-muted)]">
                Make sure the picture is clear and all important information is readable.
              </p>
              <input
                id="studentCard"
                name="studentCard"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                required
                className="mt-2 block w-full text-sm text-[var(--color-text)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:text-white hover:file:bg-[var(--color-primary-hover)] cursor-pointer"
              />
            </div>

            {/* Optional Message */}
            <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-3">
              <label htmlFor="message" className="form-label">
                Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Tell the Super Admin why you would like to become a KISHWAR Ambassador."
                className="form-input !h-auto py-3"
              />
            </div>

            <Button type="submit" variant="primary" className="self-start">
              Submit Ambassador Application
            </Button>
          </form>
        )}
      </Container>
    </div>
  );
}
