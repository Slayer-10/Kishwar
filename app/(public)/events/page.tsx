import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { spaceGrotesk } from '@/lib/fonts';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'border-[#E8A33D] text-[#E8A33D]',
  CLOSED: 'border-[#2A2E3A] text-[#C9C6BD]',
  COMPLETED: 'border-[#2A2E3A] text-[#C9C6BD]',
};

export default async function PublicEventsPage() {
  const events = await prisma.event.findMany({
    where: { status: { in: ['OPEN', 'CLOSED', 'COMPLETED'] } },
    orderBy: { eventDate: 'asc' },
  });

  const grouped = events.reduce<Record<string, typeof events>>((acc, event) => {
    const key = event.category ?? 'Other';
    acc[key] = acc[key] ? [...acc[key], event] : [event];
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="bg-[#12141C] text-[#F2F0EA]">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-[#E8A33D]">Compete</p>
        <h1 className={`${spaceGrotesk.className} mt-3 text-4xl font-bold md:text-5xl`}>Events</h1>
        <p className="mt-3 max-w-xl text-base text-[#C9C6BD]">
          Browse all competitions open for registration across every category.
        </p>

        {events.length === 0 && (
          <p className="mt-12 text-sm text-[#C9C6BD]">No events published yet.</p>
        )}

        <div className="mt-12 flex flex-col gap-14">
          {categories.map((category) => (
            <div key={category}>
              <h2 className={`${spaceGrotesk.className} text-xl font-bold text-[#F2F0EA]`}>
                {category}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[category].map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="rounded-sm border border-[#2A2E3A] p-5 transition-colors duration-150 hover:border-[#E8A33D]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-[#F2F0EA]">{event.name}</h3>
                      <span
                        className={`shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status] ?? 'border-[#2A2E3A] text-[#C9C6BD]'}`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#C9C6BD]">
                      Event: {event.eventDate.toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm text-[#C9C6BD]">
                      Deadline: {event.deadline.toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
