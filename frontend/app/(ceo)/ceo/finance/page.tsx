import { Briefcase, Download, Receipt } from 'lucide-react';
import { requireCeoSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkline } from '@/components/ui/sparkline';

export const dynamic = 'force-dynamic';

interface CeoInsights {
  ok: boolean;
  today: { totalPenalty: number };
  week: {
    totalSales: number;
    totalItems: number;
    salesByDay: number[];
    itemsByDay: number[];
    delta: number;
  };
  stores: Array<{
    id: string;
    name: string;
    hasBillz: boolean;
    weeklyTarget: number;
    monthlyTarget: number;
    weekTotal: number;
    weekItems: number;
    trend: number[];
  }>;
}

const DONUT_COLORS = [
  'var(--primary)',
  'var(--emerald)',
  'oklch(0.62 0.12 305)',
  'oklch(0.70 0.10 60)',
  'oklch(0.55 0.18 22)',
  'oklch(0.45 0.10 200)',
  'oklch(0.60 0.10 100)',
  'oklch(0.50 0.05 270)',
];

export default async function CeoFinancePage(): Promise<React.ReactElement> {
  await requireCeoSession();
  const data = await apiFetch<CeoInsights>('/api/ceo/insights');
  const { week, stores, today } = data;

  const monthlyTarget = stores.reduce((s, st) => s + (st.monthlyTarget ?? 0), 0);
  const weeklyTarget = stores.reduce((s, st) => s + (st.weeklyTarget ?? 0), 0);
  const monthlyForecast = week.totalSales * 4;
  const progress = monthlyTarget > 0 ? Math.min(100, (monthlyForecast / monthlyTarget) * 100) : 0;
  const totalItems = week.itemsByDay.reduce((s, v) => s + v, 0);
  const avgCheck = totalItems > 0 ? Math.round(week.totalSales / totalItems) : 0;

  const ranked = [...stores].sort((a, b) => b.weekTotal - a.weekTotal);
  const maxStoreRev = Math.max(1, ...ranked.map((s) => s.weekTotal));

  // Donut segments — top-7 stores + "boshqa"
  const top7 = ranked.slice(0, 7);
  const otherRev = ranked.slice(7).reduce((s, st) => s + st.weekTotal, 0);
  const segments = [
    ...top7.map((s) => ({ name: s.name, value: s.weekTotal })),
    ...(otherRev > 0 ? [{ name: 'Boshqalar', value: otherRev }] : []),
  ].filter((s) => s.value > 0);
  const segTotal = Math.max(1, segments.reduce((s, x) => s + x.value, 0));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em]">
            Moliyaviy koʻrsatkichlar
          </h1>
          <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
            Oxirgi 7 kun · {stores.length} ta doʻkon · barcha qiymatlar soʻm da
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download />
          PDF eksport
        </Button>
      </div>

      {/* Big numbers row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.06em] font-medium">
              Haftalik savdo
            </span>
            <Sparkline
              values={week.salesByDay.length > 1 ? week.salesByDay : [0, 0]}
              width={50}
              height={18}
            />
          </div>
          <div className="mt-2 text-[26px] font-semibold tabular">
            {formatMoney(week.totalSales)}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {week.delta !== 0 && (
              <Badge tone={week.delta > 0 ? 'emerald' : 'rose'} dot>
                {week.delta > 0 ? '+' : ''}
                {week.delta.toFixed(1)}%
              </Badge>
            )}
            <span className="text-[11px] text-[color:var(--ink-3)]">oʻtgan haftaga</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.06em] font-medium">
              Oylik maqsad
            </span>
            <Briefcase className="size-3.5 text-[color:var(--ink-3)]" />
          </div>
          <div className="mt-2 text-[26px] font-semibold tabular">
            {monthlyTarget > 0 ? formatMoney(monthlyTarget) : '—'}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[12px] font-semibold tabular">{progress.toFixed(1)}%</span>
            <span className="text-[11px] text-[color:var(--ink-3)]">prognoz</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.06em] font-medium">
              Bugungi jarima
            </span>
            <Sparkline
              values={[0, 0, 0, 0, 0, 0, today.totalPenalty / 1000]}
              color="var(--rose)"
              width={50}
              height={18}
            />
          </div>
          <div className="mt-2 text-[26px] font-semibold tabular text-[color:var(--rose)]">
            {formatMoney(today.totalPenalty)}
          </div>
          <span className="text-[11px] text-[color:var(--ink-3)]">soʻm · bugun</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.06em] font-medium">
              Oʻrtacha chek
            </span>
            <Receipt className="size-3.5 text-[color:var(--ink-3)]" />
          </div>
          <div className="mt-2 text-[26px] font-semibold tabular">{formatMoney(avgCheck)}</div>
          <span className="text-[11px] text-[color:var(--ink-3)]">
            soʻm · {totalItems} dona
          </span>
        </Card>
      </div>

      {/* Cumulative progress chart */}
      <Card className="p-6 mb-5">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
          <div>
            <div className="text-[14px] font-semibold">Maqsadga progress · joriy oy</div>
            <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5 tabular">
              Haftalik × 4 prognoz · {formatMoney(monthlyForecast)} /{' '}
              {monthlyTarget > 0 ? formatMoney(monthlyTarget) : '—'} soʻm
            </div>
          </div>
          <div className="flex gap-4 text-[11.5px]">
            <Legend color="var(--primary)" label="Haqiqiy" />
            <Legend color="var(--border-2)" label="Maqsad chizigʻi" />
          </div>
        </div>
        <ProgressChart actual={monthlyForecast} target={monthlyTarget} salesByDay={week.salesByDay} />
        <div className="mt-3 grid grid-cols-7 text-center">
          {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d) => (
            <span key={d} className="text-[10.5px] text-[color:var(--ink-3)]">
              {d}
            </span>
          ))}
        </div>
      </Card>

      {/* Revenue donut + store ranking */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[14px] font-semibold">Tushum tarkibi · doʻkonlar</span>
            <Badge tone="neutral">7 kun</Badge>
          </div>
          {segments.length === 0 ? (
            <p className="text-center text-[13px] text-[color:var(--ink-3)] py-8">
              Ma'lumot yo'q
            </p>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <div className="relative w-[160px] h-[160px] shrink-0">
                <Donut segments={segments} total={segTotal} />
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-[16px] font-semibold tabular">
                      {(segTotal / 1_000_000).toFixed(1)}M
                    </div>
                    <div className="text-[10.5px] text-[color:var(--ink-3)]">jami</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2 min-w-0 w-full">
                {segments.map((s, i) => {
                  const pct = (s.value / segTotal) * 100;
                  return (
                    <div key={s.name} className="flex items-center gap-2.5">
                      <span
                        className="size-2.5 rounded-sm shrink-0"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="text-[12.5px] font-medium flex-1 truncate">{s.name}</span>
                      <span className="text-[12px] text-[color:var(--ink-3)] tabular">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-[12px] font-semibold tabular min-w-[80px] text-right">
                        {formatMoney(s.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[14px] font-semibold">Reyting · do'konlar</span>
            <span className="text-[13px] font-semibold tabular">
              {formatMoney(week.totalSales)} soʻm
            </span>
          </div>
          {ranked.length === 0 ? (
            <p className="text-center text-[13px] text-[color:var(--ink-3)] py-8">
              Doʻkon yoʻq
            </p>
          ) : (
            <div className="space-y-3">
              {ranked.map((s, i) => {
                const targetProgress =
                  s.weeklyTarget > 0 ? Math.min(100, (s.weekTotal / s.weeklyTarget) * 100) : null;
                return (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10.5px] text-[color:var(--ink-3)] tabular w-4">
                        {i + 1}
                      </span>
                      <span className="text-[12.5px] font-semibold flex-1 truncate">{s.name}</span>
                      {targetProgress !== null && (
                        <Badge
                          tone={
                            targetProgress >= 90
                              ? 'emerald'
                              : targetProgress >= 60
                                ? 'amber'
                                : 'rose'
                          }
                        >
                          {targetProgress.toFixed(0)}%
                        </Badge>
                      )}
                      <span className="text-[12px] font-semibold tabular min-w-[80px] text-right">
                        {formatMoney(s.weekTotal)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[color:var(--background-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(s.weekTotal / maxStoreRev) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {weeklyTarget > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-[11.5px] text-[color:var(--ink-3)]">
              <span>Haftalik maqsad</span>
              <span className="text-foreground font-semibold tabular">
                {formatMoney(weeklyTarget)} soʻm
              </span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function ProgressChart({
  actual,
  target,
  salesByDay,
}: {
  actual: number;
  target: number;
  salesByDay: number[];
}): React.ReactElement {
  const max = Math.max(actual, target, 1);
  const points = salesByDay.map((_, i) => {
    const x = (i / Math.max(1, salesByDay.length - 1)) * 800;
    const cumul = salesByDay.slice(0, i + 1).reduce((s, x) => s + x, 0) * (target > 0 ? 4 : 1);
    const y = 200 - (cumul / max) * 180;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${path} L 800 200 L 0 200 Z` : '';

  return (
    <div className="relative h-[200px]">
      <svg viewBox="0 0 800 200" width="100%" height="100%" preserveAspectRatio="none">
        {[0, 50, 100, 150].map((y) => (
          <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="var(--border)" strokeWidth=".5" />
        ))}
        {target > 0 && (
          <path
            d="M 0 200 L 800 20"
            stroke="var(--border-2)"
            strokeWidth="2"
            strokeDasharray="4 4"
            fill="none"
          />
        )}
        {points.length > 1 && (
          <>
            <path d={area} fill="var(--primary)" opacity=".1" />
            <path
              d={path}
              stroke="var(--primary)"
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={points[points.length - 1]![0]} cy={points[points.length - 1]![1]} r="5" fill="var(--primary)" />
            <circle cx={points[points.length - 1]![0]} cy={points[points.length - 1]![1]} r="10" fill="var(--primary)" opacity=".25" />
          </>
        )}
      </svg>
      {target > 0 && (
        <span
          className="absolute top-1/2 -translate-y-1/2 right-2 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold"
        >
          Bugun · {(actual / 1_000_000).toFixed(1)}M
        </span>
      )}
    </div>
  );
}

function Donut({
  segments,
  total,
}: {
  segments: Array<{ name: string; value: number }>;
  total: number;
}): React.ReactElement {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--background-2)" strokeWidth="14" />
      {segments.map((s, i) => {
        const pct = s.value / total;
        const dash = pct * circumference;
        const el = (
          <circle
            key={s.name}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circumference}`}
            strokeDashoffset={`-${offset}`}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}
