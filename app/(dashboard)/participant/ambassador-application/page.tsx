import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { requestAmbassadorAction } from '../actions';

export default async function AmbassadorApplicationPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'PARTICIPANT' || !user.participant) {
    redirect('/login');
  }

  const [existingRequest, universities] = await Promise.all([
    prisma.ambassadorRequest.findFirst({
      where: {
        participantId: user.participant.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.university.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

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
        <div className="mt-6 space-y-2 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">
            Your Ambassador application has been submitted and is waiting for review.
          </p>
          <p>
            Please wait for an email at your registered email address. We will notify you when your application has been reviewed.
          </p>
        </div>
      )}

      {existingRequest?.status === 'APPROVED' && (
        <div className="mt-6 space-y-2 rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">
            Your Ambassador application has been approved.
          </p>
          <p>
            Please check your email for your Ambassador ID, password, and login instructions.
          </p>
        </div>
      )}

      {(!existingRequest || existingRequest.status === 'REJECTED') && (
        <form
          action={requestAmbassadorAction}
          encType="multipart/form-data"
          className="mt-8 flex max-w-xl flex-col gap-6"
        >
          {existingRequest?.status === 'REJECTED' && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Your previous Ambassador application was rejected. You may submit a new application.
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4 rounded border p-4">
            <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>

            <div>
              <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
                Full Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                defaultValue={user.participant.fullName}
                className="w-full rounded border p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                disabled
                value={user.participant.email}
                className="w-full rounded border bg-slate-100 p-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="0300-1234567"
                defaultValue={user.participant.phone ?? ''}
                className="w-full rounded border p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="gender" className="mb-1 block text-sm font-medium text-slate-700">
                Gender *
              </label>
              <select
                id="gender"
                name="gender"
                required
                className="w-full rounded border p-2.5 text-sm"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="cnic" className="mb-1 block text-sm font-medium text-slate-700">
                CNIC Number *
              </label>
              <input
                id="cnic"
                name="cnic"
                type="text"
                required
                placeholder="35202-1234567-1"
                defaultValue={user.participant.cnic ?? ''}
                className="w-full rounded border p-2.5 text-sm"
              />
            </div>
          </div>

          {/* Academic / Professional Information */}
          <div className="space-y-4 rounded border p-4">
            <h2 className="text-base font-semibold text-slate-900">Academic / Professional Information</h2>

            <div>
              <label htmlFor="universityId" className="mb-1 block text-sm font-medium text-slate-700">
                University *
              </label>
              <select
                id="universityId"
                name="universityId"
                required
                className="w-full rounded border p-2.5 text-sm"
              >
                <option value="">Select University</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name} {uni.city ? `(${uni.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="occupation" className="mb-1 block text-sm font-medium text-slate-700">
                Occupation *
              </label>
              <select
                id="occupation"
                name="occupation"
                required
                className="w-full rounded border p-2.5 text-sm"
              >
                <option value="">Select Occupation</option>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="degree" className="mb-1 block text-sm font-medium text-slate-700">
                Degree / Program *
              </label>
              <input
                id="degree"
                name="degree"
                type="text"
                required
                placeholder="e.g. BS Computer Science"
                className="w-full rounded border p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="semester" className="mb-1 block text-sm font-medium text-slate-700">
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
                className="w-full rounded border p-2.5 text-sm"
              />
            </div>
          </div>

          {/* Student Verification */}
          <div className="space-y-2 rounded border p-4">
            <h2 className="text-base font-semibold text-slate-900">Student Verification</h2>
            <label htmlFor="studentCard" className="mb-1 block text-sm font-medium text-slate-700">
              Clear picture of Student Card *
            </label>
            <p className="text-xs text-slate-500">
              Make sure the picture is clear and all important information is readable.
            </p>
            <input
              id="studentCard"
              name="studentCard"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              required
              className="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
            />
          </div>

          {/* Optional Message */}
          <div>
            <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
              Message (Optional)
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              placeholder="Tell the Super Admin why you would like to become a KISHWAR Ambassador."
              className="w-full rounded border p-3 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-fit rounded bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Submit Ambassador Application
          </button>
        </form>
      )}
    </div>
  );
}
