'use client';

import { useEffect, useState } from 'react';
import { Loader2, LogIn, LogOut, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { formatTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { LocationMapButton } from '@/components/location-map';

interface Loc {
  lat: number | null;
  lng: number | null;
  distanceMeters: number | null;
  address: string | null;
  offSite: boolean;
  source: 'store' | 'other';
  note: string;
}

interface Record {
  id: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  penaltyAmount: number;
  penaltyAccepted: boolean;
  store: { name: string } | null;
  checkInLoc: Loc | null;
  checkOutLoc: Loc | null;
}

interface HistoryResp {
  ok: boolean;
  summary: {
    present: number;
    late: number;
    leftEarly: number;
    absent: number;
    totalPenalty: number;
    workedDays: number;
  };
  records: Record[];
}

const PERIODS = [
  { key: 'day', label: 'Kun', days: 1 },
  { key: 'week', label: 'Hafta', days: 7 },
  { key: 'month', label: 'Oy', days: 30 },
] as const;

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const WEEKDAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];

function tzParts(iso: string): { day: number; month: string; weekday: string } {
  const d = new Date(new Date(iso).getTime() + TZ_OFFSET_MS);
  return {
    day: d.getUTCDate(),
    month: MONTHS_SHORT[d.getUTCMonth()] ?? '',
    weekday: WEEKDAYS_SHORT[d.getUTCDay()] ?? '',
  };
}

function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

interface LocView {
  tone: 'emerald' | 'amber' | 'neutral';
  primary: string;
  sub: string | null;
}

function locView(loc: Loc | null): LocView {
  if (!loc) return { tone: 'neutral', primary: 'Joylashuv saqlanmagan', sub: null };
  if (loc.source === 'other') {
    return { tone: 'amber', primary: loc.address ?? 'Boshqa joy', sub: loc.note || 'Boshqa joy' };
  }
  if (loc.offSite) {
    const dist = loc.distanceMeters != null ? `Do'kondan ~${fmtDist(loc.distanceMeters)} uzoqda` : "Do'kon hududidan tashqarida";
    return { tone: 'amber', primary: loc.address ?? "Do'kon hududidan tashqarida", sub: dist };
  }
  return { tone: 'emerald', primary: loc.address ?? "Do'kon hududida", sub: loc.address ? "Do'kon hududida" : null };
}

const STATUS: { [k: string]: { tone: 'emerald' | 'amber' | 'rose' | 'neutral'; label: string } } = {
  present: { tone: 'emerald', label: 'Vaqtida' },
  late: { tone: 'amber', label: 'Kech keldi' },
  left_early: { tone: 'amber', label: 'Erta ketdi' },
  absent: { tone: 'rose', label: 'Kelmadi' },
};

export function AttendanceHistory(): React.ReactElement {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[1]);
  const [data, setData] = useState<HistoryResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/attendance/history?days=${period.days}`)
      .then((r) => r.json())
      .then((d: HistoryResp) => {
        if (!cancelled) setData(d.ok ? d : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const records = data?.records ?? [];

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.015em]">Faoliyat tarixi</h2>
          <p className="text-[12px] text-[color:var(--ink-3)] mt-0.5">
            Har kungi kelgan va ketgan joyingiz
          </p>
        </div>
        <div className="inline-flex rounded-[10px] bg-[color:var(--background-2)] p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-medium transition-colors',
                period.key === p.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-[color:var(--ink-3)] hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <SummaryStat label="Vaqtida" value={data.summary.present} tone="emerald" />
          <SummaryStat label="Kech / erta" value={data.summary.late + data.summary.leftEarly} tone="amber" />
          <SummaryStat label="Kelmagan" value={data.summary.absent} tone="rose" />
          <SummaryStat
            label="Jarima"
            value={`${formatMoney(data.summary.totalPenalty)} so'm`}
            tone="neutral"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[color:var(--ink-3)]">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <CalendarDays className="size-7 text-[color:var(--ink-3)]" />
          <p className="text-[13px] text-[color:var(--ink-3)]">Bu davr uchun yozuv yo'q</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => (
            <HistoryRow key={r.id} record={r} />
          ))}
        </div>
      )}
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
}): React.ReactElement {
  const fg = {
    emerald: 'var(--emerald)',
    amber: 'var(--amber-ink)',
    rose: 'var(--rose)',
    neutral: 'var(--ink-1)',
  }[tone];
  return (
    <div className="rounded-[10px] bg-[color:var(--background-2)] px-3 py-2.5">
      <div className="text-[11px] text-[color:var(--ink-3)]">{label}</div>
      <div className="text-[15px] font-semibold tabular mt-0.5" style={{ color: fg }}>
        {value}
      </div>
    </div>
  );
}

function HistoryRow({ record }: { record: Record }): React.ReactElement {
  const d = tzParts(record.date);
  const st = STATUS[record.status] ?? STATUS.present;

  return (
    <div className="rounded-[12px] border border-[color:var(--border)] p-3.5 flex gap-3.5">
      {/* Date block */}
      <div className="flex flex-col items-center justify-center w-12 shrink-0 rounded-[10px] bg-[color:var(--background-2)] py-2">
        <span className="text-[18px] font-semibold leading-none tabular">{d.day}</span>
        <span className="text-[10px] text-[color:var(--ink-3)] mt-1">{d.month}</span>
        <span className="text-[10px] text-[color:var(--ink-3)]">{d.weekday}</span>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
          {record.store && <Badge tone="neutral">{record.store.name}</Badge>}
          {record.penaltyAmount > 0 && (
            <Badge tone="rose">💸 {formatMoney(record.penaltyAmount)} so'm</Badge>
          )}
        </div>

        <LocLine
          kind="in"
          time={record.checkIn ? formatTime(record.checkIn) : '—'}
          loc={record.checkInLoc}
        />
        <LocLine
          kind="out"
          time={record.checkOut ? formatTime(record.checkOut) : '—'}
          loc={record.checkOutLoc}
        />
      </div>
    </div>
  );
}

function LocLine({
  kind,
  time,
  loc,
}: {
  kind: 'in' | 'out';
  time: string;
  loc: Loc | null;
}): React.ReactElement {
  const view = locView(loc);
  const hasGps = loc && loc.lat != null && loc.lng != null;
  const dotColor = {
    emerald: 'var(--emerald)',
    amber: 'var(--amber)',
    neutral: 'var(--ink-3)',
  }[view.tone];

  return (
    <div className="flex items-start gap-2.5">
      <span
        className="size-6 grid place-items-center rounded-[7px] shrink-0 mt-0.5"
        style={{
          background: kind === 'in' ? 'var(--emerald-soft)' : 'var(--rose-soft)',
          color: kind === 'in' ? 'var(--emerald)' : 'var(--rose)',
        }}
      >
        {kind === 'in' ? <LogIn className="size-3.5" /> : <LogOut className="size-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] text-[color:var(--ink-3)] w-9 shrink-0">
            {kind === 'in' ? 'Keldi' : 'Ketdi'}
          </span>
          <span className="font-mono text-[13px] font-semibold tabular">{time}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 pl-[44px] -ml-[44px] sm:ml-0 sm:pl-0">
          <span
            className="size-1.5 rounded-full shrink-0"
            style={{ background: dotColor }}
          />
          <span className="text-[12px] text-[color:var(--ink-2)] truncate" title={view.primary}>
            {view.primary}
          </span>
          {hasGps && loc && (
            <LocationMapButton
              points={[
                {
                  lat: loc.lat!,
                  lng: loc.lng!,
                  tone: kind === 'in' ? 'emerald' : 'rose',
                  label: view.primary,
                },
              ]}
              title={kind === 'in' ? 'Kelgan joy' : 'Ketgan joy'}
              subtitle={loc.address ?? view.sub ?? undefined}
            />
          )}
        </div>
        {view.sub && view.sub !== view.primary && (
          <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5 truncate">{view.sub}</div>
        )}
      </div>
    </div>
  );
}
