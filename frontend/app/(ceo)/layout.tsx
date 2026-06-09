import Link from 'next/link';
import { requireCeoSession } from '@/lib/session';
import { CeoSidebar } from '@/components/ceo/ceo-sidebar';
import { CeoMobileNav } from '@/components/ceo/ceo-mobile-nav';
import { NPMark } from '@/components/brand/np-logo';

export default async function CeoLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await requireCeoSession();
  const fullName = `${user.lastName ?? ''} ${user.firstName}`.trim() || user.firstName;
  const roleLabel = user.role === 'ceo' ? 'CEO · Boshliq' : user.role;

  return (
    <div className="h-dvh flex bg-background overflow-hidden">
      <CeoSidebar fullName={fullName} role={user.role} />
      <main className="flex-1 min-w-0 overflow-x-clip overflow-y-auto flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-14 px-4 border-b border-[color:var(--border-2)] bg-background/80 backdrop-blur-sm">
          <CeoMobileNav fullName={fullName} roleLabel={roleLabel} />
          <Link href="/ceo" className="flex items-center gap-2">
            <NPMark size={24} />
            <span className="text-[14px] font-semibold">
              Nazoratchi <span className="text-[color:var(--ink-3)]">AI</span>
            </span>
          </Link>
        </header>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
