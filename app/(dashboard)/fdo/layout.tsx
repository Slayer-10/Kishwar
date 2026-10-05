import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export const dynamic = 'force-dynamic';

const NAV_ITEMS = [
  { label: 'Assigned Events', href: '/fdo' },
  { label: 'Check-In', href: '/fdo/checkin' },
  { label: 'Registrations', href: '/fdo/registrations' },
  { label: 'Payments', href: '/fdo/payments' },
];

export default async function FdoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'FDO') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
