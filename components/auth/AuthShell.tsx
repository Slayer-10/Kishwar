import React from 'react';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Left Half (Desktop >= 1024px) */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-center relative overflow-hidden"
        style={{
          backgroundColor: 'var(--color-secondary-deep)',
          backgroundImage: `
            radial-gradient(ellipse at 70% 30%, rgba(106, 172, 220, 0.25), transparent 60%),
            repeating-linear-gradient(45deg, rgba(106, 172, 220, 0.06) 0, rgba(106, 172, 220, 0.06) 1px, transparent 0, transparent 24px),
            repeating-linear-gradient(-45deg, rgba(106, 172, 220, 0.06) 0, rgba(106, 172, 220, 0.06) 1px, transparent 0, transparent 24px)
          `,
        }}
      >
        <Link href="/" className="flex flex-col items-center gap-4 text-decoration-none">
          <img
            src="/images/kishwar-logo.png"
            alt="KISHWAR Logo"
            className="w-[160px] h-[160px] rounded-full object-cover border-2 border-white/20 shadow-2xl"
          />
          <span
            style={{
              color: 'var(--color-primary)',
              fontSize: '4rem',
              lineHeight: 1,
            }}
            className="font-bold select-none drop-shadow-md mt-2"
          >
            کشور
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--fs-large)',
              color: '#FFFFFF',
            }}
            className="font-bold uppercase tracking-wider"
          >
            KISHWAR 26
          </h1>
          <p
            style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}
            className="text-sm uppercase font-semibold"
          >
            FAST NUCES MULTAN CAMPUS
          </p>
        </Link>
      </div>

      {/* Right Half: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 min-h-screen lg:min-h-0">
        {/* Mobile Logo (< 1024px) */}
        <div className="flex flex-col items-center mb-6 lg:hidden">
          <Link href="/" className="flex flex-col items-center gap-2 text-decoration-none">
            <img
              src="/images/kishwar-logo.png"
              alt="KISHWAR Logo"
              className="w-[72px] h-[72px] rounded-full object-cover border border-white/20 shadow-md"
            />
            <span
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-secondary)' }}
              className="text-xl font-bold uppercase tracking-wide"
            >
              KISHWAR 26
            </span>
          </Link>
        </div>

        {/* Auth Card */}
        <div
          className="w-full max-w-[440px] p-8 md:p-10 rounded-[var(--radius-lg)] flex flex-col gap-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-hover)',
          }}
        >
          <div className="flex flex-col gap-1">
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--fs-title1)',
                lineHeight: 'var(--lh-title1)',
                color: 'var(--color-text)',
              }}
              className="font-bold uppercase tracking-tight"
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  fontSize: 'var(--fs-footnote)',
                  lineHeight: 'var(--lh-footnote)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {children}

          {footer && <div className="pt-2 border-t border-[var(--color-divider)]">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
