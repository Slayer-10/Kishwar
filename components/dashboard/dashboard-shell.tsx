'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type NavItem = { label: string; href: string };

export function DashboardShell({
  children,
  navItems,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  userName: string;
  userRole: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-slate-50 p-4">
        <div className="mb-6 text-lg font-bold">KISHWAR</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded px-3 py-2 text-sm hover:bg-slate-200">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b p-4">
          <div className="text-sm text-slate-500">
            {userName} · <span className="font-medium">{userRole}</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
