import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

const NAV_ITEMS = [
  { label: 'Ambassador Registrations', href: '/ambassador' },
  { label: 'My Invoices & Payments', href: '/ambassador/payments' },
  { label: 'My Tickets', href: '/ambassador/tickets' },
  { label: 'Participants', href: '/ambassador/participants' },
];

export default async function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'AMBASSADOR') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
