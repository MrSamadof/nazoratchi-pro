import { Check, Clock, MapPin, X, LogIn, LogOut } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatTime, formatDate, weekdayName, formatMoney } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { AttendanceActions } from '@/components/attendance-actions';
import { AcceptPenaltyButton } from '@/components/accept-penalty-button';
import { AttendanceHistory } from '@/components/attendance-history';
import { LocationMap, type MapPoint } from '@/components/location-map';

export const dynamic = 'force-dynamic';

interface TodayResp {
  ok: boolean;
  attendance: {
    id: string;
    checkIn: string | null;
    checkOut: string | null;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    penaltyAmount: number;
    penaltyAccepted: boolean;
    status: string;
    checkInOffSite?: boolean;
    checkOutOffSite?: boolean;
    checkOutSource?: 'store' | 'other';
    checkOutNote?: string;
    checkInDistanceMeters?: number | null;
    checkOutDistanceMeters?: number | null;
    checkInSource?: 'store' | 'other';
    checkInNote?: string;
    checkInLat?: number | null;
    checkInLng?: number | null;
    checkInAddress?: string | null;
    checkOutLat?: number | null;
    checkOutLng?: number | null;
    checkOutAddress?: string | null;
  } | null;
}

interface StatsResp {
  ok: boolean;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  leftEarlyDays: number;
  totalPenalty: number;
  acceptedPenalty: number;
  pendingPenalty: number;
}

interface StoresResp {
  stores: Array<{ id: string; name: string; slug: string }>;
}

const WORK_START = 9 * 60; // 09:00 in minutes
const WORK_END = 18 * 60;

function minutesOfDay(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export default async function AttendancePage(): Promise<React.ReactElement> {
  const user = await requireSession();
  // Davomat/smena — sotuvchi va menejer uchun (kelish/ketish). CEO davomat qilmaydi.
  if (user.role === 'ceo') redirect('/dashboard');

  const [today, stats, storesResp] = await Promise.all([
    apiFetch<TodayResp>('/api/attendance/today'),
    apiFetch<StatsResp>('/api/attendance/stats?days=7'),
    user.storeId ? apiFetch<StoresResp>('/api/stores') : Promise.resolve({ stores: [] }),
  ]);

  const att = today.attendance;
  const store = storesResp.stores.find((s) => s.id === user.storeId) ?? null;
  const checkedIn = !!att?.checkIn;
  const checkedOut = !!att?.checkOut;
  const hasPenalty = (att?.penaltyAmount ?? 0) > 0;

  const todayPoints: MapPoint[] = [];
  if (att?.checkInLat != null && att?.checkInLng != null) {
    todayPoints.push({ lat: att.checkInLat, lng: att.checkInLng, tone: 'emerald', label: 'Keldim' });
  }
  if (att?.checkOutLat != null && att?.checkOutLng != null) {
    todayPoints.push({ lat: att.checkOutLat, lng: att.checkOutLng, tone: 'rose', label: 'Ketdim' });
  }

  const dateLabel = `${formatDate(new Date()).toUpperCase()} · ${weekdayName(new Date()).toUpperCase()}`;
  const nowMin = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();
  const progressNow = Math.max(0, Math.min(100, ((nowMin - WORK_START) / (WORK_END - WORK_START)) * 100));
  const progressCheckIn = att?.checkIn
    ? Math.max(0, Math.min(100, ((minutesOfDay(new Date(att.checkIn)) + 5 * 60 - WORK_START) / (WORK_END - WORK_START)) * 100))
    : 0;

  let statusTone: 'emerald' | 'amber' | 'rose' | 'accent' | 'neutral' = 'amber';
  let statusLabel = 'Kelmadi';
  if (checkedIn && !checkedOut) {
    statusTone = att?.lateMinutes && att.lateMinutes >= 5 ? 'amber' : 'accent';
    statusLabel =
      att?.lateMinutes && att.lateMinutes >= 5 ? `Kech keldi · ${att.lateMinutes} daq` : 'Smenada';
  } else if (checkedOut) {
    statusTone = att?.status === 'late' || att?.status === 'left_early' ? 'amber' : 'emerald';
    statusLabel =
      att?.status === 'late'
        ? 'Kech keldi'
        : att?.status === 'left_early'
          ? 'Erta ketdi'
          : 'Vaqtida';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Davomat</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Bugungi smena va so'nggi 7 kunlik xulosa
        </p>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        {/* Today hero with timeline */}
        <Card
          className="p-7"
          style={{ background: 'linear-gradient(140deg, var(--accent), var(--card) 70%)', borderColor: 'var(--accent-line)' }}
        >
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div className="space-y-1.5">
              <div className="text-[12px] text-[color:var(--ink-3)] tracking-[0.04em] font-medium">
                {dateLabel}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
                {store && <Badge tone="neutral">{store.name}</Badge>}
                {att?.checkInOffSite && (
                  <Badge tone="amber">
                    <MapPin className="size-3" />
                    Keldi: tashqarida
                    {att.checkInDistanceMeters
                      ? ` · ${Math.round(att.checkInDistanceMeters)} m`
                      : ''}
                  </Badge>
                )}
                {att?.checkOutOffSite && (
                  <Badge tone="amber">
                    <MapPin className="size-3" />
                    {att.checkOutSource === 'other'
                      ? 'Ketdi: boshqa joyda'
                      : `Ketdi: tashqarida${
                          att.checkOutDistanceMeters
                            ? ` · ${Math.round(att.checkOutDistanceMeters)} m`
                            : ''
                        }`}
                  </Badge>
                )}
              </div>
              {att?.checkOutNote && (
                <div className="text-[11.5px] text-[color:var(--ink-3)] italic max-w-md">
                  &ldquo;{att.checkOutNote}&rdquo;
                </div>
              )}
            </div>
            <AttendanceActions checkedIn={checkedIn} checkedOut={checkedOut} />
          </div>

          {/* Timeline */}
          <div className="mt-7">
            <div className="flex justify-between text-[11px] text-[color:var(--ink-3)] mb-1.5 tabular">
              <span>09:00</span>
              <span>12:00</span>
              <span className="font-semibold text-foreground">
                {String(Math.floor(nowMin / 60)).padStart(2, '0')}:
                {String(nowMin % 60).padStart(2, '0')} hozir
              </span>
              <span>18:00</span>
            </div>
            <div className="relative h-3.5 rounded-full bg-[color:var(--background-2)]">
              {checkedIn && (
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary"
                  style={{ width: `${progressNow}%` }}
                />
              )}
              {checkedIn && (
                <div
                  className="absolute top-[-3px] size-[20px] rounded-full bg-[color:var(--emerald)] border-[3px] border-card"
                  style={{ left: `${Math.max(0, progressCheckIn)}%`, transform: 'translateX(-50%)' }}
                />
              )}
              {checkedIn && !checkedOut && (
                <div
                  className="absolute top-[-3px] size-[22px] rounded-full bg-card border-[3px] border-primary shadow-md"
                  style={{ left: `${progressNow}%`, transform: 'translateX(-50%)' }}
                />
              )}
            </div>
            <div className="mt-3 flex justify-between text-[11.5px] flex-wrap gap-3">
              <Time label="Keldim" value={att?.checkIn ? formatTime(att.checkIn) : '—'} />
              <Time label="Smena oxiri" value="18:00" />
              <Time
                label="Holat"
                value={
                  checkedOut
                    ? 'Yakunlangan'
                    : checkedIn
                      ? statusLabel
                      : 'Kutilmoqda'
                }
              />
            </div>
          </div>

          {hasPenalty && (
            <div className="mt-5 rounded-[10px] bg-[color:var(--rose-soft)] px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[13px] text-[color:var(--rose)] font-semibold">
                💸 Bugungi jarima: {formatMoney(att!.penaltyAmount!)} so'm
                {att!.penaltyAccepted ? ' · qabul qilindi' : ''}
              </div>
              {!att!.penaltyAccepted && <AcceptPenaltyButton />}
            </div>
          )}

          {/* Bugungi joylashuv — xaritada va manzil bilan */}
          {todayPoints.length > 0 && (
            <div className="mt-5">
              <div className="text-[11.5px] font-semibold text-[color:var(--ink-2)] mb-2.5">
                Bugungi joylashuv
              </div>
              <div className="grid sm:grid-cols-[200px_1fr] gap-3.5">
                <LocationMap points={todayPoints} className="h-40 sm:h-full min-h-[150px]" />
                <div className="space-y-2">
                  {att?.checkIn && (
                    <TodayLoc
                      kind="in"
                      time={formatTime(att.checkIn)}
                      address={att.checkInAddress ?? null}
                      dist={att.checkInDistanceMeters ?? null}
                      offSite={att.checkInOffSite ?? false}
                      source={att.checkInSource ?? 'store'}
                      note={att.checkInNote ?? ''}
                    />
                  )}
                  {att?.checkOut && (
                    <TodayLoc
                      kind="out"
                      time={formatTime(att.checkOut)}
                      address={att.checkOutAddress ?? null}
                      dist={att.checkOutDistanceMeters ?? null}
                      offSite={att.checkOutOffSite ?? false}
                      source={att.checkOutSource ?? 'store'}
                      note={att.checkOutNote ?? ''}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 7-day summary */}
        <Card className="p-5">
          <div className="flex items-baseline justify-between mb-3.5">
            <span className="text-[13px] font-semibold">7 kunlik xulosa</span>
            <span className="text-[11px] text-[color:var(--ink-3)]">oxirgi hafta</span>
          </div>
          <div className="space-y-2.5">
            <SummaryRow
              icon={<Check className="size-3.5" />}
              tone="emerald"
              label="Vaqtida"
              value={stats.presentDays}
            />
            <SummaryRow
              icon={<Clock className="size-3.5" />}
              tone="amber"
              label="Kech keldi"
              value={stats.lateDays}
            />
            <SummaryRow
              icon={<X className="size-3.5" />}
              tone="rose"
              label="Erta ketgan"
              value={stats.leftEarlyDays}
            />
            <SummaryRow
              icon={<X className="size-3.5" />}
              tone="neutral"
              label="Kelmadi"
              value={Math.max(0, 7 - stats.totalDays)}
            />
          </div>
          <div className="my-3.5 h-px bg-[color:var(--border)]" />
          <div className="flex justify-between">
            <div>
              <div className="text-[11px] text-[color:var(--ink-3)]">Jarima</div>
              <div className="text-[14px] font-semibold text-[color:var(--rose)] tabular">
                {formatMoney(stats.totalPenalty)} so'm
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[color:var(--ink-3)]">Qabul qilingan</div>
              <div className="text-[14px] font-semibold tabular">
                {formatMoney(stats.acceptedPenalty)} so'm
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Faoliyat tarixi — kun/hafta/oy bo'yicha kelgan/ketgan joylar */}
      <AttendanceHistory />
    </div>
  );
}

function Time({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[color:var(--ink-3)]">{label}</span>
      <span className="font-mono text-[16px] font-semibold tabular">{value}</span>
    </div>
  );
}

function SummaryRow({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
  label: string;
  value: number;
}): React.ReactElement {
  const bg = {
    emerald: 'var(--emerald-soft)',
    amber: 'var(--amber-soft)',
    rose: 'var(--rose-soft)',
    neutral: 'var(--background-2)',
  }[tone];
  const fg = {
    emerald: 'var(--emerald)',
    amber: 'var(--amber-ink)',
    rose: 'var(--rose)',
    neutral: 'var(--ink-2)',
  }[tone];
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-7 rounded-[8px] grid place-items-center shrink-0"
        style={{ background: bg, color: fg }}
      >
        {icon}
      </span>
      <span className="text-[12.5px] font-medium flex-1">{label}</span>
      <span className="font-mono text-[14px] font-semibold tabular">{value}</span>
    </div>
  );
}

function TodayLoc({
  kind,
  time,
  address,
  dist,
  offSite,
  source,
  note,
}: {
  kind: 'in' | 'out';
  time: string;
  address: string | null;
  dist: number | null;
  offSite: boolean;
  source: 'store' | 'other';
  note: string;
}): React.ReactElement {
  const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
  let primary: string;
  let sub: string | null;
  if (source === 'other') {
    primary = address ?? 'Boshqa joy';
    sub = note || 'Boshqa joy';
  } else if (offSite) {
    primary = address ?? "Do'kon hududidan tashqarida";
    sub = dist != null ? `Do'kondan ~${fmtDist(dist)} uzoqda` : null;
  } else {
    primary = address ?? "Do'kon hududida";
    sub = address ? "Do'kon hududida" : null;
  }

  return (
    <div className="flex items-start gap-2.5 rounded-[10px] bg-[color:var(--card)] border border-[color:var(--border)] px-3 py-2.5">
      <span
        className="size-7 grid place-items-center rounded-[8px] shrink-0"
        style={{
          background: kind === 'in' ? 'var(--emerald-soft)' : 'var(--rose-soft)',
          color: kind === 'in' ? 'var(--emerald)' : 'var(--rose)',
        }}
      >
        {kind === 'in' ? <LogIn className="size-3.5" /> : <LogOut className="size-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] text-[color:var(--ink-3)]">
            {kind === 'in' ? 'Keldim' : 'Ketdim'}
          </span>
          <span className="font-mono text-[13px] font-semibold tabular">{time}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <MapPin className="size-3 shrink-0 text-[color:var(--ink-3)]" />
          <span className="text-[12px] text-[color:var(--ink-2)] truncate" title={primary}>
            {primary}
          </span>
        </div>
        {sub && sub !== primary && (
          <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5 truncate">{sub}</div>
        )}
      </div>
    </div>
  );
}
