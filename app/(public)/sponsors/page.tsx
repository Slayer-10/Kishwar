import { spaceGrotesk } from '@/lib/fonts';

type Sponsor = {
  name: string;
  tier: 'Title' | 'Gold' | 'Silver' | 'Bronze';
};

const SPONSORS: Sponsor[] = [
  { name: 'Sponsor Name', tier: 'Title' },
  { name: 'Sponsor Name', tier: 'Gold' },
  { name: 'Sponsor Name', tier: 'Gold' },
  { name: 'Sponsor Name', tier: 'Silver' },
  { name: 'Sponsor Name', tier: 'Silver' },
  { name: 'Sponsor Name', tier: 'Silver' },
  { name: 'Sponsor Name', tier: 'Bronze' },
  { name: 'Sponsor Name', tier: 'Bronze' },
];

const TIER_ORDER: Sponsor['tier'][] = ['Title', 'Gold', 'Silver', 'Bronze'];

export default function SponsorsPage() {
  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    sponsors: SPONSORS.filter((s) => s.tier === tier),
  })).filter((group) => group.sponsors.length > 0);

  return (
    <div className="bg-[#12141C] text-[#F2F0EA]">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-[#E8A33D]">Partners</p>
        <h1 className={`${spaceGrotesk.className} mt-3 text-4xl font-bold md:text-5xl`}>Sponsors</h1>
        <p className="mt-3 max-w-xl text-base text-[#C9C6BD]">
          KISHWAR is made possible by the support of our sponsors and partners.
        </p>

        <div className="mt-12 flex flex-col gap-14">
          {grouped.map((group) => (
            <div key={group.tier}>
              <h2 className={`${spaceGrotesk.className} text-xl font-bold text-[#F2F0EA]`}>
                {group.tier} Sponsor{group.sponsors.length > 1 ? 's' : ''}
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {group.sponsors.map((sponsor, i) => (
                  <div
                    key={`${sponsor.name}-${i}`}
                    className="flex h-24 items-center justify-center rounded-sm border border-[#2A2E3A] px-4 text-center text-sm text-[#C9C6BD] transition-colors duration-150 hover:border-[#E8A33D]"
                  >
                    {sponsor.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-sm border border-[#2A2E3A] p-6">
          <p className="text-sm text-[#C9C6BD]">
            Interested in sponsoring KISHWAR? Reach out at{' '}
            <span className="text-[#E8A33D]">kishwar@nu.edu.pk</span>
          </p>
        </div>
      </section>
    </div>
  );
}
