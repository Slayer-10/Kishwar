import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { InactivityLogout } from '@/components/InactivityLogout';

export const dynamic = 'force-dynamic';

const NAV_ITEMS = [
  { label: 'Ambassador Registrations', href: '/ambassador' },
  { label: 'Registration Requests', href: '/ambassador/requests' },
  { label: 'Participants', href: '/ambassador/participants' },
  { label: 'My Registrations', href: '/ambassador/my-registrations' },
  { label: 'Campus Payments', href: '/ambassador/payments' },
  { label: 'My Tickets', href: '/ambassador/tickets' },
];

export default async function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'AMBASSADOR') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      <InactivityLogout />
      {children}
    </DashboardShell>
  );
}
