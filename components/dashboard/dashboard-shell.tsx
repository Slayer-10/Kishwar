'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export type NavItem = { label: string; href: string };

export function DashboardShell({
  children,
  navItems,
  userName,
  userRole,
  pageTitle,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  userName: string;
  userRole: string;
  pageTitle?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Format user role display string
  const roleDisplay =
    userRole === 'SUPER_ADMIN'
      ? 'Admin'
      : userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="flex flex-col gap-6">
        {/* Top Logo Branding */}
        <Link href="/" className="flex items-center gap-3 text-decoration-none">
          <img
            src="/images/kishwar-logo.png"
            alt="KISHWAR Logo"
            className="h-[40px] w-[40px] rounded-full object-cover border border-white/20"
          />
          <div className="flex flex-col">
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-text-on-dark)',
                fontSize: '18px',
                lineHeight: 1.1,
              }}
              className="font-bold uppercase tracking-wide"
            >
              KISHWAR 26
            </span>
            <span
              style={{
                color: 'var(--color-accent)',
                fontSize: 'var(--fs-caption1)',
                lineHeight: 'var(--lh-caption1)',
              }}
              className="font-semibold uppercase tracking-wider"
            >
              {roleDisplay}
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-4 font-semibold uppercase text-decoration-none transition-colors"
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '15px',
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--color-text-on-dark)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Info & Logout Button */}
      <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
        <div className="flex flex-col px-2">
          <span className="text-xs text-white/60 truncate">{userName}</span>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full text-white border-white/30 hover:bg-white/10 flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Desktop Sidebar (260px) */}
      <aside
        className="hidden lg:flex w-[260px] shrink-0 border-r border-white/10 flex-col"
        style={{
          backgroundColor: 'var(--color-secondary-deep)',
          color: 'var(--color-text-on-dark)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Top Navigation Bar (< 1024px) */}
        <header
          className="flex lg:hidden items-center justify-between px-5 h-[64px] border-b border-white/10 z-30"
          style={{
            backgroundColor: 'var(--color-secondary-deep)',
            color: 'var(--color-text-on-dark)',
          }}
        >
          <Link href="/" className="flex items-center gap-2 text-decoration-none">
            <img
              src="/images/kishwar-logo.png"
              alt="KISHWAR Logo"
              className="h-[32px] w-[32px] rounded-full object-cover"
            />
            <span
              style={{ fontFamily: 'var(--font-heading)' }}
              className="font-bold text-base uppercase text-white"
            >
              KISHWAR 26 ({roleDisplay})
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-white hover:opacity-80 focus:outline-none"
            aria-label="Toggle Navigation Drawer"
          >
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </header>

        {/* Mobile Off-canvas Drawer */}
        {mobileOpen && (
          <div
            className="fixed inset-0 top-[64px] z-40 lg:hidden flex flex-col"
            style={{
              backgroundColor: 'var(--color-secondary-deep)',
              color: 'var(--color-text-on-dark)',
            }}
          >
            <SidebarContent />
          </div>
        )}

        {/* Main Content View */}
        <main className="flex-1 p-6 md:p-8 w-full max-w-[1200px] mx-auto">
          {pageTitle && (
            <div className="flex flex-col mb-8">
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--fs-title1)',
                  lineHeight: 'var(--lh-title1)',
                  color: 'var(--color-text)',
                }}
                className="font-bold uppercase tracking-tight"
              >
                {pageTitle}
              </h1>
              <div
                className="mt-2 h-[4px] w-[56px] rounded-[2px]"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
