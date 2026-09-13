import Link from 'next/link';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { spaceGrotesk } from '@/lib/fonts';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Events', href: '/events' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Ambassadors', href: '/ambassadors' },
];

export function Footer() {
  return (
    <footer className="border-t border-[#2A2E3A] bg-[#12141C] text-[#C9C6BD]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <p className={`${spaceGrotesk.className} text-lg font-bold text-[#F2F0EA]`}>KISHWAR</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            FAST-NUCES Multan's mega event — competitions across computing, business,
            and sports, open to universities nationwide.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-[#F2F0EA]">Navigate</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors duration-150 hover:text-[#E8A33D]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-[#F2F0EA]">Contact</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>FAST-NUCES, Multan Campus</li>
            <li>kishwar@nu.edu.pk</li>
          </ul>
          <div className="mt-4 flex gap-4">
            <Link href="#" aria-label="Facebook" className="text-[#C9C6BD] hover:text-[#E8A33D]">
              <Facebook size={18} />
            </Link>
            <Link href="#" aria-label="Instagram" className="text-[#C9C6BD] hover:text-[#E8A33D]">
              <Instagram size={18} />
            </Link>
            <Link href="#" aria-label="LinkedIn" className="text-[#C9C6BD] hover:text-[#E8A33D]">
              <Linkedin size={18} />
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2A2E3A] px-6 py-4 text-center text-xs">
        © {new Date().getFullYear()} KISHWAR, FAST-NUCES Multan. All rights reserved.
      </div>
    </footer>
  );
}
