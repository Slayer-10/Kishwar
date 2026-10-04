import Link from 'next/link';
import { spaceGrotesk } from '@/lib/fonts';
import { getCurrentUser } from '@/lib/auth';

const STATS = [
  { label: 'Participants', value: '2,000+' },
  { label: 'Universities', value: '40+' },
  { label: 'Prize Pool', value: 'PKR 500,000+' },
  { label: 'Events', value: '30+' },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  let ambassadorHref = '/ambassador-application';
  let ambassadorLabel = 'Become an Ambassador';

  if (user) {
    if (user.role === 'PARTICIPANT') {
      ambassadorHref = '/ambassador-application';
    } else if (user.role === 'AMBASSADOR') {
      ambassadorHref = '/ambassador';
      ambassadorLabel = 'Ambassador Dashboard';
    } else if (user.role === 'SUPER_ADMIN') {
      ambassadorHref = '/admin';
    } else if (user.role === 'FDO') {
      ambassadorHref = '/fdo';
    }
  }

  return (
    <div className="bg-[#12141C] text-[#F2F0EA]">
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24 md:py-32">
        <p className="text-sm font-medium uppercase tracking-widest text-[#E8A33D]">
          FAST-NUCES Multan Presents
        </p>
        <h1 className={`${spaceGrotesk.className} text-5xl font-bold leading-tight md:text-7xl`}>
          KISHWAR
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-[#C9C6BD] md:text-lg">
          A national-level mega event bringing together competitions in computing,
          business, sports, and social categories — open to universities across Pakistan.
        </p>

        <div className="mt-2 rounded-sm border border-[#2A2E3A] px-5 py-3">
          <p className="text-xs uppercase tracking-widest text-[#C9C6BD]">Dates to be announced</p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/events"
            className="rounded-sm border border-[#2A2E3A] px-6 py-3 text-center text-sm font-medium text-[#F2F0EA] transition-colors duration-150 hover:border-[#E8A33D] hover:text-[#E8A33D]"
          >
            Explore Events
          </Link>
          <Link
            href={ambassadorHref}
            className="rounded-sm border border-[#E8A33D] px-6 py-3 text-center text-sm font-medium text-[#E8A33D] transition-colors duration-150 hover:bg-[#E8A33D] hover:text-[#12141C]"
          >
            {ambassadorLabel}
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-[#2A2E3A]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <p className={`${spaceGrotesk.className} text-3xl font-bold text-[#F2F0EA] md:text-4xl`}>
                {stat.value}
              </p>
              <p className="text-sm text-[#C9C6BD]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="border-t border-[#2A2E3A]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-[#E8A33D]">
            About KISHWAR
          </p>
          <h2 className={`${spaceGrotesk.className} mt-3 max-w-2xl text-3xl font-bold md:text-4xl`}>
            One event, every discipline.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9C6BD]">
            KISHWAR is FAST-NUCES Multan&apos;s flagship mega event, hosting competitions
            across computing, business, sports, and social categories. Teams from
            universities nationwide compete, network, and showcase their talent over
            multiple days of events.
          </p>
        </div>
      </section>
    </div>
  );
}
