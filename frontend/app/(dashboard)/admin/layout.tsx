import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/session';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await requireSession();
  if (user.role !== 'manager' && user.role !== 'ceo') redirect('/dashboard');
  // Savdo hisobotlari faqat CEO uchun — menejer savdoni ko'rmaydi.
  const tabs: Array<[string, string]> = [
    ['/admin', 'Bosh sahifa'],
    ['/admin/pending', 'Kutilayotgan'],
    ['/admin/employees', 'Xodimlar'],
    ['/admin/schedule', 'Jadval'],
    ['/admin/rules', 'Qoidalar'],
    ...(user.role === 'ceo' ? [['/admin/reports', 'Hisobotlar'] as [string, string]] : []),
    ['/admin/audit-logs', 'Audit log'],
  ];
  return (
    <div className="space-y-6">
      <nav className="border-b -mt-6 -mx-4 px-4 pt-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(([href, label]) => (
            <Link
              key={href}
              href={href!}
              className="px-3 py-2 text-sm font-medium border-b-2 border-transparent hover:border-muted-foreground/30 hover:text-foreground text-muted-foreground transition-colors whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
