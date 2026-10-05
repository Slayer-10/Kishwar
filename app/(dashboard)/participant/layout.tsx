import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export const dynamic = 'force-dynamic';

const NAV_ITEMS = [
  { label: 'My Registrations', href: '/participant' },
  { label: 'Invoices & Payments', href: '/participant/payments' },
  { label: 'My Tickets', href: '/participant/tickets' },
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'PARTICIPANT') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
