'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface NavbarProps {
  isLoggedIn: boolean;
  dashboardHref: string;
}

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Events', href: '/events' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Ambassadors', href: '/ambassadors' },
];

export function Navbar({ isLoggedIn, dashboardHref }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 w-full transition-colors"
      style={{
        height: '72px',
        backgroundColor: 'rgba(22, 36, 73, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-5 md:px-8">
        {/* Left: Logo + Branding */}
        <Link href="/" className="flex items-center gap-3 text-decoration-none">
          <img
            src="/images/kishwar-logo.png"
            alt="KISHWAR Logo"
            className="h-[44px] w-[44px] rounded-full object-cover border border-white/10"
          />
          <div className="flex flex-col">
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-text-on-dark)',
                fontSize: '20px',
                lineHeight: 1.1,
              }}
              className="font-bold uppercase tracking-wide"
            >
              KISHWAR 26
            </span>
            <span
              style={{
                color: 'var(--color-accent)',
                fontSize: '10px',
                letterSpacing: '0.15em',
                lineHeight: 1.2,
              }}
              className="font-semibold uppercase"
            >
              FAST NUCES MULTAN
            </span>
          </div>
        </Link>

        {/* Center Links (Desktop >= 1024px) */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative py-2 font-semibold uppercase text-decoration-none transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '15px',
                  letterSpacing: '0.06em',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-on-dark)',
                  textUnderlineOffset: '6px',
                  borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Auth Buttons (Desktop >= 1024px) */}
        <div className="hidden items-center gap-3 lg:flex">
          {isLoggedIn ? (
            <Button href={dashboardHref} variant="primary">
              Dashboard
            </Button>
          ) : (
            <>
              <Button href="/login" variant="ghost">
                Login
              </Button>
              <Button href="/signup" variant="primary">
                Register
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger (<1024px) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-white hover:opacity-80 focus:outline-none lg:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Slide-down Panel */}
      {mobileMenuOpen && (
        <div
          className="w-full flex flex-col lg:hidden border-b shadow-xl"
          style={{
            backgroundColor: 'var(--color-secondary-deep)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-6 uppercase font-semibold text-decoration-none transition-colors"
                style={{
                  height: '56px',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '15px',
                  letterSpacing: '0.06em',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-on-dark)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Auth Actions in Mobile Menu */}
          <div className="flex flex-col gap-3 p-6">
            {isLoggedIn ? (
              <Button
                href={dashboardHref}
                variant="primary"
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  href="/login"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Button>
                <Button
                  href="/signup"
                  variant="primary"
                  className="w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
