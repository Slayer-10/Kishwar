import React from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

export function Footer() {
  const { social, contactEmail, contactPhone, venue, tagline } = siteConfig;

  const quickNav = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
    { label: 'Sponsors', href: '/sponsors' },
    { label: 'Ambassadors', href: '/ambassadors' },
  ];

  const accountNav = [
    { label: 'Login', href: '/login' },
    { label: 'Sign Up', href: '/signup' },
    { label: 'Forgot Password', href: '/forgot-password' },
  ];

  return (
    <footer
      style={{
        backgroundColor: 'var(--color-secondary-deep)',
        color: 'var(--color-text-on-dark)',
      }}
      className="w-full"
    >
      <div
        className="mx-auto max-w-[1200px] px-5 md:px-8"
        style={{ paddingTop: 'var(--section-pad-y)', paddingBottom: 'var(--section-pad-y)' }}
      >
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 md:grid-cols-2">
          {/* Col 1 */}
          <div className="flex flex-col items-start gap-3">
            <img
              src="/images/kishwar-logo.png"
              alt="KISHWAR Logo"
              className="h-[72px] w-[72px] rounded-full object-cover border border-white/10"
            />
            <p className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-accent)' }}>
              {tagline}
            </p>
            <p className="text-xs opacity-80 leading-relaxed">
              Where talent meets the heritage of Multan.
            </p>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-3">
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '16px',
                color: 'var(--color-accent)',
              }}
              className="font-semibold uppercase tracking-wider"
            >
              Quick Navigation
            </h3>
            <ul className="flex flex-col gap-2 p-0 m-0 list-none text-sm opacity-90">
              {quickNav.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[var(--color-accent)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col gap-3">
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '16px',
                color: 'var(--color-accent)',
              }}
              className="font-semibold uppercase tracking-wider"
            >
              Account
            </h3>
            <ul className="flex flex-col gap-2 p-0 m-0 list-none text-sm opacity-90">
              {accountNav.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[var(--color-accent)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 */}
          <div className="flex flex-col gap-3">
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '16px',
                color: 'var(--color-accent)',
              }}
              className="font-semibold uppercase tracking-wider"
            >
              Contact
            </h3>
            <ul className="flex flex-col gap-2 p-0 m-0 list-none text-sm opacity-90">
              {venue && <li>{venue}</li>}
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className="hover:text-[var(--color-accent)]">
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li>
                  <a href={`tel:${contactPhone}`} className="hover:text-[var(--color-accent)]">
                    {contactPhone}
                  </a>
                </li>
              )}
            </ul>

            {/* Social Icons Row */}
            <div className="flex items-center gap-4 pt-2">
              {social?.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  <Instagram size={20} />
                </a>
              )}
              {social?.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  <Facebook size={20} />
                </a>
              )}
              {social?.linkedin && (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  <Linkedin size={20} />
                </a>
              )}
              {social?.youtube && (
                <a
                  href={social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  <Youtube size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="w-full py-4 text-center text-xs opacity-75"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        © 2026 KISHWAR, FAST-NUCES Multan. All rights reserved.
      </div>
    </footer>
  );
}
