import React from 'react';
import { prisma } from '@/lib/prisma';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';

function getInitials(email: string): string {
  if (!email) return 'AM';
  const namePart = email.split('@')[0];
  const parts = namePart.split(/[\._\-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return namePart.substring(0, 2).toUpperCase();
}

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
    <div className="w-full flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Page Header Band */}
      <section
        style={{
          backgroundColor: 'var(--color-secondary-deep)',
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
        className="w-full"
      >
        <Container>
          <SectionHeading
            onDark
            eyebrow="Network"
            title="Ambassadors & Partner Universities"
            subtitle="Campus ambassadors representing partner universities across Pakistan."
          />
        </Container>
      </section>

      {/* Main Universities Grid */}
      <section style={{ paddingTop: 'var(--section-pad-y)', paddingBottom: 'var(--section-pad-y)' }} className="w-full">
        <Container>
          {universities.length === 0 && (
            <p className="text-base text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No partner universities added yet.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {universities.map((uni) => (
              <div
                key={uni.id}
                className="flex flex-col p-6 rounded-[var(--radius-lg)] border-l-[6px]"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderLeftColor: 'var(--color-secondary)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--fs-title2)',
                    lineHeight: 'var(--lh-title2)',
                    color: 'var(--color-text)',
                  }}
                  className="font-bold tracking-tight"
                >
                  {uni.name}
                </h2>
                {uni.city && (
                  <p
                    style={{
                      fontSize: 'var(--fs-footnote)',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {uni.city}
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-3 pt-4 border-t border-[var(--color-divider)]">
                  {uni.ambassadors.length === 0 ? (
                    <p
                      style={{
                        fontSize: 'var(--fs-footnote)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      No ambassador assigned yet.
                    </p>
                  ) : (
                    uni.ambassadors.map((amb) => {
                      const initials = getInitials(amb.user.email);

                      return (
                        <div key={amb.id} className="flex items-center justify-between gap-3 py-1">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center w-[44px] h-[44px] rounded-full text-white font-bold select-none shrink-0"
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                fontFamily: 'var(--font-heading)',
                              }}
                            >
                              {initials}
                            </div>
                            <span
                              style={{
                                fontSize: 'var(--fs-subhead)',
                                color: 'var(--color-text)',
                              }}
                              className="font-semibold"
                            >
                              {amb.user.email}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: 'var(--fs-caption1)',
                              color: 'var(--color-secondary-deep)',
                              backgroundColor: 'var(--color-background)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-pill)',
                            }}
                            className="font-bold uppercase tracking-wider shrink-0"
                          >
                            {amb.ambassadorCode}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
