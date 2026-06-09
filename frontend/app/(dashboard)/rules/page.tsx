import Link from 'next/link';
import {
  Briefcase,
  Clock,
  FileText,
  Info,
  ReceiptText,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface Rule {
  id: string;
  title: string;
  category: string;
  content: string;
  order: number;
}

const categoryMeta: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  general: { label: 'Umumiy', icon: Info },
  work_hours: { label: 'Ish vaqti', icon: Clock },
  attendance: { label: 'Davomat', icon: Briefcase },
  sales: { label: 'Savdo', icon: ReceiptText },
  conduct: { label: 'Xulq-atvor', icon: Users },
  penalties: { label: 'Jarimalar', icon: Wallet },
};

const CATEGORY_ORDER = ['general', 'work_hours', 'attendance', 'sales', 'conduct', 'penalties'];

export default async function RulesPage(): Promise<React.ReactElement> {
  const user = await requireSession();
  const isManager = user.role === 'manager' || user.role === 'ceo';
  const data = await apiFetch<{ ok: boolean; rules: Rule[] }>('/api/rules');
  const rules = data.rules ?? [];

  const byCat = new Map<string, Rule[]>();
  for (const r of rules) {
    const cat = r.category ?? 'general';
    const list = byCat.get(cat) ?? [];
    list.push(r);
    byCat.set(cat, list);
  }
  for (const list of byCat.values()) list.sort((a, b) => a.order - b.order);

  const orderedCats = CATEGORY_ORDER.filter((c) => byCat.has(c)).concat(
    Array.from(byCat.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Kompaniya qoidalari</h1>
          <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
            Ish vaqti, davomat, savdo va jarimalar — bitta joyda
          </p>
        </div>
        {isManager && (
          <Link href="/admin/rules">
            <Button variant="outline" size="sm">
              <Settings />
              Boshqarish
            </Button>
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
        {/* Sub-nav */}
        <Card className="p-3.5 lg:sticky lg:top-6">
          <nav className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            {orderedCats.map((cat) => {
              const meta = categoryMeta[cat] ?? { label: cat, icon: FileText };
              const Icon = meta.icon;
              const list = byCat.get(cat) ?? [];
              return (
                <a
                  key={cat}
                  href={`#${cat}`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)] whitespace-nowrap"
                >
                  <Icon className="size-3.5" />
                  <span className="flex-1">{meta.label}</span>
                  <span className="text-[10.5px] opacity-60">{list.length}</span>
                </a>
              );
            })}
          </nav>
          <div className="hidden lg:block h-px bg-[color:var(--border)] my-3" />
          <div className="hidden lg:block px-1">
            <div className="text-[10.5px] text-[color:var(--ink-3)] uppercase tracking-[0.06em] font-medium">
              Hammasi
            </div>
            <div className="text-[12.5px] text-[color:var(--ink-2)] mt-0.5">
              {rules.length} ta qoida
            </div>
          </div>
        </Card>

        {/* Content */}
        <div className="space-y-4">
          {rules.length === 0 && (
            <Card className="py-14 text-center text-[13px] text-[color:var(--ink-3)]">
              Hozircha qoidalar kiritilmagan.
            </Card>
          )}
          {orderedCats.map((cat) => {
            const meta = categoryMeta[cat] ?? { label: cat, icon: FileText };
            const Icon = meta.icon;
            const list = byCat.get(cat) ?? [];
            return (
              <Card key={cat} id={cat} className="p-6 scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="size-9 grid place-items-center rounded-[10px] bg-accent text-[color:var(--primary)]">
                    <Icon className="size-4" />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[15px] font-semibold">{meta.label}</div>
                    <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">
                      {list.length} ta qoida
                    </div>
                  </div>
                </div>
                <div className="space-y-3.5">
                  {list.map((r, i) => (
                    <div key={r.id} className="flex items-start gap-3.5">
                      <span className="font-mono text-[11px] text-[color:var(--ink-3)] min-w-[24px] pt-1 tabular">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold">{r.title}</div>
                        <p className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.6] mt-1">
                          {r.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

