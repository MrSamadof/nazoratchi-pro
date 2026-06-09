import { ChartLine, Receipt } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatTime, formatDate } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SaleForm } from '@/components/sale-form';

export const dynamic = 'force-dynamic';

interface SalesResp {
  ok: boolean;
  sales: Array<{
    id: string;
    quantity: number;
    notes: string;
    source: 'manual' | 'billz';
    createdAt: string;
  }>;
}
interface StatsResp {
  ok: boolean;
  totalQuantity: number;
  saleDays: number;
}
interface StoresResp {
  stores: Array<{ id: string; name: string }>;
}

export default async function SalesPage(): Promise<React.ReactElement> {
  const user = await requireSession();
  // Savdo faqat xodimlar uchun — menejer va CEO savdo kiritmaydi/ko'rmaydi.
  if (user.role !== 'employee') redirect('/dashboard');

  const [salesData, stats, storesResp] = await Promise.all([
    apiFetch<SalesResp>('/api/sales'),
    apiFetch<StatsResp>('/api/sales/stats?days=7'),
    user.storeId ? apiFetch<StoresResp>('/api/stores') : Promise.resolve({ stores: [] }),
  ]);

  const sales = salesData.sales ?? [];
  const store = storesResp.stores.find((s) => s.id === user.storeId) ?? null;

  const todayQty = sales.reduce((acc, s) => acc + (s.quantity ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Savdo</h1>
          <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
            {formatDate(new Date())}
            {store && <> · {store.name}</>} · O'zingiz kiritgan yozuvlar
          </p>
        </div>
        <SaleForm />
      </div>

      {/* KPI tiles — faqat xodimning o'z savdolari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatTile
          icon={<Receipt className="size-4" />}
          tone="accent"
          label="Bugun · qo'lda"
          value={String(sales.length)}
          unit={`yozuv · ${todayQty} dona`}
        />
        <StatTile
          icon={<ChartLine className="size-4" />}
          tone="emerald"
          label="7 kun"
          value={String(stats.totalQuantity)}
          unit={`dona · ${stats.saleDays} kun`}
        />
      </div>

      {/* Add form ref + History */}
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
        <Card className="p-6">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-[14px] font-semibold">Yangi savdo qo'shish</span>
            <Badge tone="accent">Qo'lda kiritish</Badge>
          </div>
          <p className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.55]">
            Smena davomida har sotuvni shu yerga kiriting. Bu yozuvlar reyting va kunlik
            hisobotda hisobga olinadi.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-[color:var(--ink-2)]">
            <div className="p-3 rounded-[10px] bg-[color:var(--background-2)]">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-[color:var(--ink-3)] font-medium">
                Qoʻshish tartibi
              </div>
              <div className="mt-1">Mahsulot soni va izoh</div>
            </div>
            <div className="p-3 rounded-[10px] bg-[color:var(--background-2)]">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-[color:var(--ink-3)] font-medium">
                Tahrir
              </div>
              <div className="mt-1">Bugungi yozuvni o'chirish/oʻzgartirish — admin bilan</div>
            </div>
          </div>
          <div className="mt-5">
            <SaleForm triggerLabel="Yangi savdo qo'shish" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-baseline mb-3.5">
            <span className="text-[14px] font-semibold">Bugungi yozuvlar</span>
            <span className="text-[11.5px] text-[color:var(--ink-3)]">{sales.length} yozuv</span>
          </div>
          {sales.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-[color:var(--ink-3)]">
              Hozircha yozuv yoʻq. Yangi savdo qoʻshing.
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[60px_60px_1fr] gap-2.5 px-2.5 py-1.5 text-[10.5px] font-medium text-[color:var(--ink-3)] uppercase tracking-[0.06em]">
                <span>Vaqt</span>
                <span>Soni</span>
                <span>Izoh</span>
              </div>
              {sales.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[60px_60px_1fr] gap-2.5 px-2.5 py-3 items-baseline border-t border-[color:var(--border)]"
                >
                  <span className="font-mono text-[12px] text-[color:var(--ink-2)]">
                    {formatTime(s.createdAt)}
                  </span>
                  <span className="text-[13px] font-semibold">{s.quantity}</span>
                  <span className="text-[12px] text-[color:var(--ink-2)] truncate">
                    {s.notes || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  tone,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  tone?: 'accent' | 'emerald';
  label: string;
  value: string;
  unit?: string;
}): React.ReactElement {
  const bg = tone === 'accent' ? 'var(--accent)' : tone === 'emerald' ? 'var(--emerald-soft)' : 'var(--background-2)';
  const fg = tone === 'accent' ? 'var(--primary)' : tone === 'emerald' ? 'var(--emerald)' : 'var(--ink-2)';
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.06em] font-medium">
          {label}
        </span>
        <span
          className="size-8 grid place-items-center rounded-[8px]"
          style={{ background: bg, color: fg }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-[22px] font-semibold tracking-[-0.025em] tabular">
        {value}
        {unit && (
          <span className="text-[11.5px] font-medium text-[color:var(--ink-3)] ml-1.5">{unit}</span>
        )}
      </div>
    </Card>
  );
}
