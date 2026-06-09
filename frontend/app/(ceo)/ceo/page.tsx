import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bolt,
  Calendar,
  ChevronRight,
  Info,
  Mail,
  Store as StoreIcon,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { requireCeoSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { fullDateLabel, formatMoney } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Sparkline } from '@/components/ui/sparkline';

export const dynamic = 'force-dynamic';

interface CeoInsights {
  ok: boolean;
  today: {
    checkedIn: number;
    late: number;
    absent: number;
    totalPenalty: number;
    totalEmployees: number;
  };
  week: {
    totalSales: number;
    totalItems: number;
    salesByDay: number[];
    itemsByDay: number[];
    presentByDay: number[];
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

interface AdminOverview {
  ok: boolean;
  pendingUsers: number;
  pendingApprovals: number;
}

export default async function CeoDashboardPage(): Promise<React.ReactElement> {
  const user = await requireCeoSession();

  const [ins, ov] = await Promise.all([
    apiFetch<CeoInsights>('/api/ceo/insights'),
    apiFetch<AdminOverview>('/api/admin/overview'),
  ]);

  const { today, week, stores } = ins;
  const { pendingUsers, pendingApprovals } = ov;

  const weeklyTarget = stores.reduce((s, st) => s + (st.weeklyTarget ?? 0), 0);
  const progress = weeklyTarget > 0 ? Math.min(100, (week.totalSales / weeklyTarget) * 100) : 0;
  const remaining = Math.max(0, weeklyTarget - week.totalSales);
  const deltaStr = week.delta === 0 ? '—' : `${week.delta > 0 ? '+' : ''}${week.delta.toFixed(1)}%`;
  const deltaPositive = week.delta >= 0;

  const top = stores[0];
  const struggling = stores.find((s) => s.weeklyTarget > 0 && s.weekTotal / s.weeklyTarget < 0.5);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] text-[color:var(--ink-3)]">
              {fullDateLabel(new Date())}
            </span>
            <StatusPill tone="emerald">
              {stores.length} doʻkon · {today.checkedIn} smenada
            </StatusPill>
          </div>
          <h1 className="mt-1 text-[28px] lg:text-[32px] font-semibold tracking-[-0.03em]">
            Xayrli kun, {user.firstName} 👋
          </h1>
          <p className="mt-1 text-[14px] text-[color:var(--ink-2)] max-w-[640px]">
            Hafta xulosa:{' '}
            <span className="font-semibold text-foreground tabular">
              {formatMoney(week.totalSales)} soʻm
            </span>
            {week.delta !== 0 && (
              <>
                {' '}
                <span
                  className={
                    deltaPositive ? 'text-[color:var(--emerald)]' : 'text-[color:var(--rose)]'
                  }
                >
                  ({deltaStr})
                </span>
              </>
            )}
            {top && top.weekTotal > 0 && (
              <>
                , <b className="text-foreground">{top.name}</b> yetakchi
              </>
            )}
            {struggling && (
              <>
                , <b className="text-foreground">{struggling.name}</b> ga eʼtibor
              </>
            )}
            .
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" size="sm">
            <Calendar />
            Bu hafta
          </Button>
          <Link href="/ceo/ai-analysis">
            <Button size="sm">
              <Bolt />
              Yangi AI tahlil
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero KPI row */}
      <div className="grid lg:grid-cols-[1.4fr_1.4fr] gap-4 mb-5">
        {/* Weekly sales hero */}
        <Card
          className="p-6 text-white border-transparent relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, oklch(0.18 0.012 268), oklch(0.30 0.05 268))',
          }}
        >
          <svg
            className="absolute -right-10 -top-10 opacity-12 pointer-events-none"
            width="220"
            height="220"
            viewBox="0 0 200 200"
            aria-hidden
          >
            <circle cx="100" cy="100" r="98" fill="none" stroke="#fff" />
            <circle cx="100" cy="100" r="65" fill="none" stroke="#fff" />
          </svg>
          <div className="flex justify-between items-start relative">
            <div>
              <div className="text-[11.5px] opacity-65 uppercase tracking-[0.06em]">
                Haftalik savdo
              </div>
              <div className="text-[11px] opacity-55 mt-0.5">Billz + qoʻlda · oxirgi 7 kun</div>
            </div>
            {week.delta !== 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 ${
                  deltaPositive ? 'bg-emerald-400/25 text-emerald-200' : 'bg-rose-400/25 text-rose-200'
                }`}
              >
                <span className="size-1.5 rounded-full bg-current opacity-80" />
                {deltaStr}
              </span>
            )}
          </div>
          <div className="mt-4 text-[42px] font-semibold tracking-[-0.03em] tabular relative">
            {formatMoney(week.totalSales)}{' '}
            <span className="text-[14px] font-medium opacity-65">soʻm</span>
          </div>
          {weeklyTarget > 0 && (
            <>
              <div className="mt-3 flex gap-6 text-[11.5px] opacity-90 relative">
                <HeroStat label="Maqsad" value={`${(weeklyTarget / 1_000_000).toFixed(1)}M`} />
                <HeroStat label="Bajarildi" value={`${progress.toFixed(1)}%`} />
                <HeroStat
                  label="Yana"
                  value={remaining > 0 ? `${(remaining / 1_000_000).toFixed(1)}M` : '✓'}
                />
              </div>
              <div className="mt-3.5 h-1.5 rounded-full bg-white/15 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </Card>

        {/* 4 small KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Kpi
            label="Bugungi savdo"
            value={formatMoney(week.salesByDay[week.salesByDay.length - 1] ?? 0)}
            unit="soʻm"
            trend={week.salesByDay}
            tone="accent"
          />
          <Kpi
            label="Mahsulot"
            value={String(week.totalItems)}
            trend={week.itemsByDay}
            tone="emerald"
          />
          <Kpi
            label="Smenadagi"
            value={`${today.checkedIn}`}
            unit={`/ ${today.totalEmployees}`}
            trend={week.presentByDay}
            tone="neutral"
            extra={
              <>
                {today.late > 0 && <Badge tone="amber" dot>{today.late} kech</Badge>}
                {today.absent > 0 && <Badge tone="rose" dot>{today.absent} yoʻq</Badge>}
              </>
            }
          />
          <Kpi
            label="Jarima · bugun"
            value={formatMoney(today.totalPenalty)}
            unit="soʻm"
            trend={[0, 0, 0, 0, 0, 0, today.totalPenalty / 1000]}
            tone="rose"
          />
        </div>
      </div>

      {/* Stores grid + AI brief */}
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4 mb-5">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="text-[14px] font-semibold">Doʻkonlar · jonli holat</div>
              <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">
                Hafta savdosi va trend
              </div>
            </div>
            <Link href="/ceo/stores" className="text-[12px] text-primary font-medium">
              Hammasi →
            </Link>
          </div>
          {stores.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-[color:var(--ink-3)]">
              Doʻkon yoʻq.{' '}
              <Link href="/ceo/stores" className="text-primary font-medium">
                Yangi qoʻshing
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {stores.map((s, idx) => {
                const hot = idx === 0 && s.weekTotal > 0;
                const danger = s.weeklyTarget > 0 && s.weekTotal / s.weeklyTarget < 0.5;
                const targetProgress =
                  s.weeklyTarget > 0 ? Math.min(100, (s.weekTotal / s.weeklyTarget) * 100) : null;
                return (
                  <div
                    key={s.id}
                    className="rounded-[14px] p-3.5 border"
                    style={{
                      background: hot
                        ? 'linear-gradient(135deg, oklch(0.97 0.05 78), var(--card) 70%)'
                        : 'var(--background-2)',
                      borderColor: hot
                        ? 'oklch(0.85 0.12 78)'
                        : danger
                          ? 'var(--rose-soft)'
                          : 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13.5px] font-semibold truncate">{s.name}</span>
                          {hot && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                              🔥
                            </span>
                          )}
                          {danger && <Badge tone="rose">attention</Badge>}
                        </div>
                        <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5">
                          {s.weekItems > 0 ? `${s.weekItems} dona` : "ma'lumot yo'q"}
                          {s.hasBillz ? ' · Billz' : ''}
                        </div>
                      </div>
                      <Sparkline
                        values={s.trend.length > 1 ? s.trend : [0, 0]}
                        width={64}
                        height={22}
                        color={
                          danger
                            ? 'var(--rose)'
                            : hot
                              ? 'oklch(0.65 0.18 60)'
                              : 'var(--primary)'
                        }
                      />
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-[20px] font-semibold tracking-[-0.02em] tabular">
                        {s.weekTotal > 0
                          ? `${(s.weekTotal / 1_000_000).toFixed(1)}M`
                          : '—'}{' '}
                        <span className="text-[10.5px] text-[color:var(--ink-3)] font-medium">
                          soʻm
                        </span>
                      </span>
                      {targetProgress !== null && (
                        <span
                          className="text-[12px] font-semibold"
                          style={{
                            color:
                              targetProgress >= 90
                                ? 'var(--emerald)'
                                : targetProgress >= 60
                                  ? 'var(--ink-2)'
                                  : 'var(--rose)',
                          }}
                        >
                          {targetProgress.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* AI brief preview */}
        <Card
          className="p-6 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(150deg, var(--accent), var(--card) 70%)',
            borderColor: 'var(--accent-line)',
          }}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <span className="size-9 grid place-items-center rounded-[10px] bg-primary text-primary-foreground">
                <Bolt className="size-[17px]" />
              </span>
              <div className="leading-tight">
                <div className="text-[14px] font-semibold">Haftalik AI brifing</div>
                <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5">
                  Gemini · har dushanba
                </div>
              </div>
            </div>
            <Badge tone="ink">v3</Badge>
          </div>

          <div className="mt-4 p-3 rounded-[10px] bg-card border border-dashed border-[color:var(--accent-line)] text-[13px] leading-[1.55]">
            {top && top.weekTotal > 0 ? (
              <>
                <b>Bu hafta yutuq:</b> {top.name} {formatMoney(top.weekTotal)} soʻm savdo bilan
                yetakchi
                {week.delta > 0 && <> — hafta umumiy {deltaStr}</>}.
              </>
            ) : (
              <>
                <b>Maʼlumot kutilmoqda:</b> birinchi haftalik tahlil sotuvlar bilan birga
                tayyorlanadi.
              </>
            )}
          </div>

          <div className="mt-3.5 space-y-2.5">
            {top && top.weekTotal > 0 && (
              <BriefRow
                tone="emerald"
                icon={<ArrowUp className="size-[11px]" />}
                text={
                  <>
                    <b>{top.name}</b> oldinda.{' '}
                    {top.weeklyTarget > 0 &&
                      `Maqsad ${((top.weekTotal / top.weeklyTarget) * 100).toFixed(0)}% bajarildi.`}
                  </>
                }
              />
            )}
            {struggling && (
              <BriefRow
                tone="rose"
                icon={<ArrowDown className="size-[11px]" />}
                text={
                  <>
                    <b>{struggling.name}</b> maqsaddan{' '}
                    {((struggling.weekTotal / struggling.weeklyTarget) * 100).toFixed(0)}% da —
                    menejer bilan koʻrib chiqing.
                  </>
                }
              />
            )}
            {today.late > 0 && (
              <BriefRow
                tone="amber"
                icon={<TriangleAlert className="size-[11px]" />}
                text={
                  <>
                    Bugun <b>{today.late} ta xodim</b> kech keldi.
                  </>
                }
              />
            )}
            {pendingApprovals > 0 && (
              <BriefRow
                tone="accent"
                icon={<Info className="size-[11px]" />}
                text={
                  <>
                    <b>{pendingApprovals} ta ruxsat soʻrovi</b> hal qilishni kutmoqda.
                  </>
                }
              />
            )}
          </div>

          <div className="mt-5 pt-3.5 border-t border-[color:var(--accent-line)]">
            <Link href="/ceo/ai-analysis">
              <Button size="sm" className="w-full">
                Toʻliq tahlilni ochish
                <ArrowRight />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Attention */}
      <Card className="p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[14px] font-semibold">Eʼtibor talab qiladi</div>
          <Badge tone="rose">{pendingUsers + pendingApprovals + today.absent} ta</Badge>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {pendingUsers > 0 && (
            <Att
              icon={<Users className="size-4" />}
              tone="amber"
              title={`${pendingUsers} yangi xodim`}
              sub="Tasdiqlanmagan"
              href="/admin/pending"
            />
          )}
          {pendingApprovals > 0 && (
            <Att
              icon={<Mail className="size-4" />}
              tone="accent"
              title={`${pendingApprovals} soʻrov`}
              sub="Kutilmoqda"
              href="/admin"
            />
          )}
          {today.absent > 0 && (
            <Att
              icon={<StoreIcon className="size-4" />}
              tone="rose"
              title={`${today.absent} kelmadi`}
              sub="Bugun"
              href="/admin/employees"
            />
          )}
          {pendingUsers + pendingApprovals + today.absent === 0 && (
            <div className="md:col-span-3 text-center py-6 text-[13px] text-[color:var(--ink-3)]">
              ✨ Hammasi tartibda
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="opacity-65">{label}</span>
      <span className="text-[14px] font-semibold tabular">{value}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  trend,
  tone,
  extra,
}: {
  label: string;
  value: string;
  unit?: string;
  trend: number[];
  tone: 'emerald' | 'amber' | 'rose' | 'accent' | 'neutral';
  extra?: React.ReactNode;
}): React.ReactElement {
  const color = {
    emerald: 'var(--emerald)',
    amber: 'var(--amber)',
    rose: 'var(--rose)',
    accent: 'var(--primary)',
    neutral: 'var(--ink-2)',
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.04em]">
          {label}
        </span>
        <Sparkline values={trend.length > 1 ? trend : [0, 0]} width={64} height={20} color={color} />
      </div>
      <div
        className="mt-2 text-[22px] font-semibold tabular"
        style={{ color: tone === 'rose' ? color : undefined }}
      >
        {value}
        {unit && (
          <span className="text-[12px] font-medium text-[color:var(--ink-3)] ml-1">{unit}</span>
        )}
      </div>
      {extra && <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">{extra}</div>}
    </Card>
  );
}

function BriefRow({
  tone,
  icon,
  text,
}: {
  tone: 'emerald' | 'rose' | 'amber' | 'accent';
  icon: React.ReactNode;
  text: React.ReactNode;
}): React.ReactElement {
  const bg = {
    emerald: 'var(--emerald-soft)',
    rose: 'var(--rose-soft)',
    amber: 'var(--amber-soft)',
    accent: 'var(--accent)',
  }[tone];
  const fg = {
    emerald: 'var(--emerald)',
    rose: 'var(--rose)',
    amber: 'var(--amber-ink)',
    accent: 'var(--primary)',
  }[tone];
  return (
    <div className="flex items-start gap-2">
      <span
        className="size-5 grid place-items-center rounded-full shrink-0 mt-0.5"
        style={{ background: bg, color: fg }}
      >
        {icon}
      </span>
      <span className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.55]">{text}</span>
    </div>
  );
}

function Att({
  icon,
  tone,
  title,
  sub,
  href,
}: {
  icon: React.ReactNode;
  tone: 'amber' | 'rose' | 'accent';
  title: string;
  sub: string;
  href: string;
}): React.ReactElement {
  const bg = { amber: 'var(--amber-soft)', rose: 'var(--rose-soft)', accent: 'var(--accent)' }[
    tone
  ];
  const fg = { amber: 'var(--amber-ink)', rose: 'var(--rose)', accent: 'var(--primary)' }[tone];
  return (
    <Link
      href={href}
      className="flex items-start gap-2.5 p-3 rounded-[10px] bg-[color:var(--background-2)] hover:bg-[color:var(--background-2)]/70 transition-colors"
    >
      <span
        className="size-8 rounded-[8px] grid place-items-center shrink-0"
        style={{ background: bg, color: fg }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold">{title}</div>
        <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5">{sub}</div>
      </div>
      <ChevronRight className="size-3.5 text-[color:var(--ink-3)] mt-1.5 shrink-0" />
    </Link>
  );
}
