import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

const NAV_ITEMS = [
  { label: 'Events', href: '/admin' },
  { label: 'Universities', href: '/admin/universities' },
  { label: 'Ambassadors', href: '/admin/ambassadors' },
  { label: 'Registrations', href: '/admin/registrations' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Audit Log', href: '/admin/audit-log' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'SUPER_ADMIN') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
