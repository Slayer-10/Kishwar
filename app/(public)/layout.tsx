import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  FDO: '/fdo',
  AMBASSADOR: '/ambassador',
  PARTICIPANT: '/participant',
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const dashboardHref = user ? ROLE_HOME[user.role] ?? '/participant' : '/login';

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      <Navbar isLoggedIn={!!user} dashboardHref={dashboardHref} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
