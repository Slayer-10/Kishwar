import { prisma } from '@/lib/prisma';
import { spaceGrotesk } from '@/lib/fonts';

export default async function AmbassadorsPage() {
  const universities = await prisma.university.findMany({
    orderBy: { name: 'asc' },
    include: {
      ambassadors: {
        include: { user: { select: { email: true } } },
      },
    },
  });

  return (
    <div className="bg-[#12141C] text-[#F2F0EA]">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-[#E8A33D]">Network</p>
        <h1 className={`${spaceGrotesk.className} mt-3 text-4xl font-bold md:text-5xl`}>
          Ambassadors &amp; Partner Universities
        </h1>
        <p className="mt-3 max-w-xl text-base text-[#C9C6BD]">
          Campus ambassadors representing partner universities across Pakistan.
        </p>

        {universities.length === 0 && (
          <p className="mt-12 text-sm text-[#C9C6BD]">No partner universities added yet.</p>
        )}

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((uni) => (
            <div key={uni.id} className="rounded-sm border border-[#2A2E3A] p-5">
              <h2 className="text-base font-semibold text-[#F2F0EA]">{uni.name}</h2>
              {uni.city && <p className="mt-1 text-sm text-[#C9C6BD]">{uni.city}</p>}

              <div className="mt-4 flex flex-col gap-2 border-t border-[#2A2E3A] pt-4">
                {uni.ambassadors.length === 0 ? (
                  <p className="text-xs text-[#C9C6BD]">No ambassador assigned yet.</p>
                ) : (
                  uni.ambassadors.map((amb) => (
                    <div key={amb.id} className="text-xs text-[#C9C6BD]">
                      <span className="text-[#E8A33D]">{amb.ambassadorCode}</span> — {amb.user.email}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
