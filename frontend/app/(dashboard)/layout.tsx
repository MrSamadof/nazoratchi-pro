import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardMobileNav } from '@/components/dashboard-mobile-nav';
import { NotificationBell } from '@/components/notification-bell';

interface StoresResponse {
  stores: Array<{ id: string; name: string; slug: string }>;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await requireSession();
  const isAdmin = user.role === 'manager' || user.role === 'ceo';
  const isCeo = user.role === 'ceo';
  const isManager = user.role === 'manager';

  const fullName = `${user.lastName ?? ''} ${user.firstName}`.trim() || user.firstName;
  const roleLabel =
    user.role === 'ceo' ? 'CEO' : user.role === 'manager' ? 'Menejer' : 'Sotuvchi';

  let storeName: string | null = null;
  if (user.storeId) {
    const data = await apiFetch<StoresResponse>('/api/stores');
    storeName = data.stores.find((s) => s.id === user.storeId)?.name ?? null;
  }

  return (
    <div className="h-dvh flex bg-background overflow-hidden">
      <DashboardSidebar
        user={{
          firstName: user.firstName,
          lastName: user.lastName ?? '',
          role: user.role,
          storeName,
        }}
        isAdmin={isAdmin}
        isCeo={isCeo}
        isManager={isManager}
      />
      <main className="flex-1 min-w-0 flex flex-col overflow-x-clip overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center gap-3 h-14 px-4 sm:px-6 lg:px-8 border-b border-[color:var(--border-2)] bg-background/80 backdrop-blur-sm">
          <DashboardMobileNav
            isAdmin={isAdmin}
            isCeo={isCeo}
            isManager={isManager}
            fullName={fullName}
            roleLabel={roleLabel}
          />
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
