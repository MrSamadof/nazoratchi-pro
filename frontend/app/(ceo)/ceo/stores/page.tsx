import { Store as StoreIcon } from 'lucide-react';
import { requireCeoSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from '@/components/ui/sparkline';
import { StoresManager } from '@/components/ceo/stores-manager';

export const dynamic = 'force-dynamic';

interface CeoInsights {
  ok: boolean;
  stores: Array<{
    id: string;
    name: string;
    hasBillz: boolean;
    weeklyTarget: number;
    weekTotal: number;
    weekItems: number;
    trend: number[];
  }>;
}

interface StoresFullResp {
  ok: boolean;
  stores: Array<{
    id: string;
    name: string;
    slug: string;
    kind: 'store' | 'office';
    hasBillz: boolean;
    billzUuid: string | null;
    workStartTime: string;
    workEndTime: string;
    address: string;
    phone: string;
    location: { lat: number; lng: number } | null;
    geofenceRadiusMeters: number;
    weeklyTarget: number;
    monthlyTarget: number;
  }>;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function CeoStoresPage(): Promise<React.ReactElement> {
  await requireCeoSession();
  const [data, full] = await Promise.all([
    apiFetch<CeoInsights>('/api/ceo/insights'),
    apiFetch<StoresFullResp>('/api/stores/full'),
  ]);
  const stores = data.stores ?? [];
  const fullStores = full.stores ?? [];
  const maxRev = Math.max(1, ...stores.map((s) => s.weekTotal));
  const totalRev = stores.reduce((s, st) => s + st.weekTotal, 0);
  const grown = stores.filter((s) => s.trend[s.trend.length - 1]! > (s.trend[0] ?? 0)).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em]">Do&apos;konlar · taqqoslash</h1>
          <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
            {stores.length} ta do&apos;kon · oxirgi 7 kun · jami{' '}
            <span className="font-semibold tabular">{(totalRev / 1_000_000).toFixed(1)}M so&apos;m</span>
          </p>
        </div>
      </div>

      {/* Podium */}
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {stores.slice(0, 3).map((s, i) => (
          <Card
            key={s.id}
            className="p-5 flex flex-col justify-between min-h-[180px]"
            style={{
              background:
                i === 0
                  ? 'linear-gradient(180deg, oklch(0.97 0.05 78), var(--card) 60%)'
                  : 'var(--card)',
              borderColor: i === 0 ? 'oklch(0.85 0.12 78)' : 'var(--border)',
            }}
          >
            <div className="flex justify-between items-start">
              <span className="text-[28px]">{MEDALS[i]}</span>
              <Sparkline
                values={s.trend.length > 1 ? s.trend : [0, 0]}
                color={i === 0 ? 'oklch(0.65 0.18 60)' : 'var(--primary)'}
                width={70}
                height={28}
              />
            </div>
            <div className="space-y-1 mt-3">
              <div className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.06em]">
                {s.hasBillz ? 'Billz POS' : 'Manual'}
              </div>
              <div className="text-[17px] font-semibold tracking-[-0.015em]">{s.name}</div>
              <div className="text-[22px] font-semibold tabular mt-1">
                {formatMoney(s.weekTotal)}{' '}
                <span className="text-[11px] font-medium text-[color:var(--ink-3)]">so&apos;m</span>
              </div>
              <div className="text-[11px] text-[color:var(--ink-3)]">{s.weekItems} mahsulot</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Ranking table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-3">
          <span className="text-[14px] font-semibold">Hammasi · reyting</span>
          <div className="flex gap-1.5">
            <Badge tone="ink">Hammasi · {stores.length}</Badge>
            {grown > 0 && (
              <Badge tone="emerald" dot>
                O&apos;sgan · {grown}
              </Badge>
            )}
          </div>
        </div>
        <div className="rounded-[12px] overflow-hidden border">
          <div className="bg-[color:var(--background-2)] flex items-center px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-[color:var(--ink-3)] font-medium">
            <span className="w-8">#</span>
            <span className="flex-[2]">Do&apos;kon</span>
            <span className="flex-1 text-right">Savdo</span>
            <span className="hidden flex-[1.4] pl-5 md:block">Hissa · trend</span>
            <span className="flex-1 text-right">Maqsad</span>
          </div>
          {stores.map((s, idx) => {
            const targetProgress =
              s.weeklyTarget > 0 ? Math.min(100, (s.weekTotal / s.weeklyTarget) * 100) : null;
            const rank = idx + 1;
            return (
              <div
                key={s.id}
                className="flex items-center px-4 py-3 border-t bg-card hover:bg-[color:var(--background-2)]/40"
              >
                <span
                  className={`w-8 text-[13px] font-semibold tabular ${
                    rank <= 3 ? 'text-primary' : 'text-[color:var(--ink-3)]'
                  }`}
                >
                  {rank}
                </span>
                <div className="flex-[2] flex items-center gap-2.5 min-w-0">
                  <span className="size-8 grid place-items-center rounded-[8px] bg-[color:var(--background-2)] text-[color:var(--ink-2)] shrink-0">
                    <StoreIcon className="size-3.5" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="text-[13px] font-semibold truncate">{s.name}</div>
                    <div className="text-[11px] text-[color:var(--ink-3)]">{s.weekItems} mahsulot</div>
                  </div>
                </div>
                <div className="flex-1 text-right tabular">
                  <div className="text-[13px] font-semibold">{formatMoney(s.weekTotal)}</div>
                  <div className="text-[10.5px] text-[color:var(--ink-3)]">so&apos;m</div>
                </div>
                <div className="hidden flex-[1.4] pl-5 md:flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 bg-[color:var(--background-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.weekTotal / maxRev) * 100}%`,
                        background: rank <= 3 ? 'var(--primary)' : 'var(--ink-3)',
                      }}
                    />
                  </div>
                  <Sparkline
                    values={s.trend.length > 1 ? s.trend : [0, 0]}
                    color={rank === stores.length ? 'var(--rose)' : 'var(--primary)'}
                    width={50}
                    height={18}
                  />
                </div>
                <div className="flex-1 text-right">
                  {targetProgress !== null ? (
                    <Badge
                      tone={targetProgress >= 90 ? 'emerald' : targetProgress >= 60 ? 'amber' : 'rose'}
                    >
                      {targetProgress.toFixed(0)}%
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-[color:var(--ink-3)]">—</span>
                  )}
                </div>
              </div>
            );
          })}
          {stores.length === 0 && (
            <div className="p-10 text-center text-[13px] text-[color:var(--ink-3)] border-t">
              Hech qanday do&apos;kon yo&apos;q
            </div>
          )}
        </div>
      </Card>

      {/* CRUD — qo'shish, tahrirlash, o'chirish */}
      <div className="mt-6">
        <StoresManager initialStores={fullStores} />
      </div>
    </div>
  );
}
