import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { submitPublicAmbassadorApplication } from './actions';

export default async function PublicAmbassadorApplicationPage({
  searchParams,
}: {
  searchParams: { submitted?: string; request?: string; email?: string };
}) {
  const user = await getCurrentUser();

  // If user is already an Ambassador
  if (user?.role === 'AMBASSADOR') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-[#F2F0EA]">
        <h1 className="text-3xl font-bold">Ambassador Application</h1>
        <div className="mt-6 space-y-3 rounded-sm border border-green-500/40 bg-green-500/10 p-6 text-sm text-green-200">
          <p className="text-base font-semibold">Your ambassador application has been approved.</p>
          <p>You are an active Ambassador representing your university.</p>
          <div className="pt-2">
            <Link
              href="/ambassador"
              className="inline-block rounded-sm bg-[#E8A33D] px-5 py-2.5 text-sm font-medium text-[#12141C]"
            >
              Go to Ambassador Dashboard →
            </Link>
          </div>
        </div>
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
    <div className="bg-[#12141C] text-[#F2F0EA]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-[#C9C6BD] hover:text-[#E8A33D]">
          ← Back to KISHWAR Home
        </Link>

        <h1 className="mt-6 text-3xl font-bold md:text-4xl">
          Become a KISHWAR Ambassador
        </h1>

        <p className="mt-2 text-base leading-relaxed text-[#C9C6BD]">
          Campus ambassadors represent partner universities across Pakistan and manage event registrations for their institution.
        </p>

        {isPending && (
          <div className="mt-8 space-y-3 rounded-sm border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-200">
            <p className="text-base font-semibold">
              Application submitted successfully.
            </p>
            <p>
              Your application is now waiting for review by the KISHWAR administration.
            </p>
            <p>
              Please wait for an email regarding the result of your application.
            </p>
            {existingRequest?.university && (
              <p className="text-xs text-[#C9C6BD] border-t border-amber-500/20 pt-3">
                Applied for: <span className="font-semibold text-white">{existingRequest.university.name}</span>
              </p>
            )}
          </div>
        )}

        {existingRequest?.status === 'APPROVED' && !isPending && (
          <div className="mt-8 space-y-3 rounded-sm border border-green-500/40 bg-green-500/10 p-6 text-sm text-green-200">
            <p className="text-base font-semibold">
              Your ambassador application has been approved.
            </p>
            <p>
              Please check your email for your Ambassador credentials and login instructions.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block rounded-sm bg-[#E8A33D] px-5 py-2.5 text-sm font-medium text-[#12141C]"
              >
                Log In Now →
              </Link>
            </div>
          </div>
        )}

        {(!existingRequest || existingRequest.status === 'REJECTED') && !isPending && (
          <form
            action={submitPublicAmbassadorApplication}
            encType="multipart/form-data"
            className="mt-8 flex flex-col gap-6"
          >
            {existingRequest?.status === 'REJECTED' && (
              <div className="rounded-sm border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                Your previous Ambassador application was rejected. You may submit a new application below.
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4 rounded-sm border border-[#2A2E3A] p-5">
              <h2 className="text-base font-semibold text-[#F2F0EA]">Personal Information</h2>

              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  defaultValue={user?.participant?.fullName ?? ''}
                  placeholder="e.g. Ali Khan"
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  Email Address *
                </label>
                {user?.participant ? (
                  <>
                    <input
                      type="hidden"
                      name="email"
                      value={user.participant.email}
                    />
                    <input
                      id="email"
                      type="email"
                      disabled
                      value={user.participant.email}
                      className="w-full rounded-sm border border-[#2A2E3A] bg-[#12141C] p-2.5 text-sm text-[#C9C6BD] cursor-not-allowed"
                    />
                  </>
                ) : (
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  Phone Number *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="0300-1234567"
                  defaultValue={user?.participant?.phone ?? ''}
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="gender" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  Gender *
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="cnic" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  CNIC Number *
                </label>
                <input
                  id="cnic"
                  name="cnic"
                  type="text"
                  required
                  placeholder="35202-1234567-1"
                  defaultValue={user?.participant?.cnic ?? ''}
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                />
              </div>
            </div>

            {/* Academic / Professional Information */}
            <div className="space-y-4 rounded-sm border border-[#2A2E3A] p-5">
              <h2 className="text-base font-semibold text-[#F2F0EA]">Academic / Professional Information</h2>

              <div>
                <label htmlFor="universityId" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  University *
                </label>
                <select
                  id="universityId"
                  name="universityId"
                  required
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
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
                <label htmlFor="occupation" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  Occupation *
                </label>
                <select
                  id="occupation"
                  name="occupation"
                  required
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                >
                  <option value="">Select Occupation</option>
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="degree" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                  Degree / Program *
                </label>
                <input
                  id="degree"
                  name="degree"
                  type="text"
                  required
                  placeholder="e.g. BS Computer Science"
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="semester" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
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
                  className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-2.5 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
                />
              </div>
            </div>

            {/* Student Verification */}
            <div className="space-y-2 rounded-sm border border-[#2A2E3A] p-5">
              <h2 className="text-base font-semibold text-[#F2F0EA]">Student Verification</h2>
              <label htmlFor="studentCard" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                Clear picture of Student Card *
              </label>
              <p className="text-xs text-[#C9C6BD]">
                Make sure the picture is clear and all important information is readable.
              </p>
              <input
                id="studentCard"
                name="studentCard"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                required
                className="mt-2 block w-full text-sm text-[#C9C6BD] file:mr-4 file:rounded-sm file:border-0 file:bg-[#E8A33D] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#12141C] hover:file:bg-[#D9922E]"
              />
            </div>

            {/* Optional Message */}
            <div>
              <label htmlFor="message" className="mb-1 block text-sm font-medium text-[#C9C6BD]">
                Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Tell the Super Admin why you would like to become a KISHWAR Ambassador."
                className="w-full rounded-sm border border-[#2A2E3A] bg-[#1A1D27] p-3 text-sm text-[#F2F0EA] focus:border-[#E8A33D] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-fit rounded-sm bg-[#E8A33D] px-6 py-3 text-sm font-medium text-[#12141C] hover:bg-[#D9922E]"
            >
              Submit Ambassador Application
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
