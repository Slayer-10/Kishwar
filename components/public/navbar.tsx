'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { spaceGrotesk } from '@/lib/fonts';

type NavbarProps = {
  isLoggedIn: boolean;
  dashboardHref: string;
};

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Events', href: '/events' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Ambassadors', href: '/ambassadors' },
];

export function Navbar({ isLoggedIn, dashboardHref }: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#2A2E3A] bg-[#12141C]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className={`${spaceGrotesk.className} text-xl font-bold tracking-tight text-[#F2F0EA]`}>
          KISHWAR
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[#C9C6BD] transition-colors duration-150 hover:text-[#E8A33D]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {isLoggedIn ? (
            <Link
              href={dashboardHref}
              className="rounded-sm border border-[#E8A33D] px-4 py-2 text-sm font-medium text-[#E8A33D] transition-colors duration-150 hover:bg-[#E8A33D] hover:text-[#12141C]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-[#C9C6BD] transition-colors duration-150 hover:text-[#E8A33D]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-sm bg-[#E8A33D] px-4 py-2 text-sm font-medium text-[#12141C] transition-colors duration-150 hover:bg-[#D9922E]"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="text-[#F2F0EA] md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-[#2A2E3A] px-6 py-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-[#C9C6BD] hover:text-[#E8A33D]"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-[#2A2E3A] pt-4">
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                onClick={() => setOpen(false)}
                className="rounded-sm border border-[#E8A33D] px-4 py-2 text-center text-sm font-medium text-[#E8A33D]"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="py-2 text-center text-sm text-[#C9C6BD]">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-sm bg-[#E8A33D] px-4 py-2 text-center text-sm font-medium text-[#12141C]"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
