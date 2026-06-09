import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Clock,
  LogOut,
  Mail,
  Plus,
} from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatTime, weekdayName, formatDate, formatMoney } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { LeaderboardCard, type LeaderboardData } from '@/components/leaderboard';

export const dynamic = 'force-dynamic';

interface AttendanceResp {
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
  } | null;
}
interface SalesResp {
  ok: boolean;
  sales: Array<{ id: string; quantity: number }>;
}
interface ApprovalsResp {
  ok: boolean;
  approvals: Array<{ id: string; status: string; type: string; requestedDate: string; reason: string }>;
}
interface AttendanceStatsResp {
  ok: boolean;
  totalDays: number;
  presentDays: number;
  lateDays: number;
}

const RULE_CATS = [
  { slug: 'general', label: 'Umumiy' },
  { slug: 'work_hours', label: 'Ish vaqti' },
  { slug: 'attendance', label: 'Davomat' },
  { slug: 'sales', label: 'Savdo' },
  { slug: 'conduct', label: 'Xulq-atvor' },
  { slug: 'penalties', label: 'Jarimalar' },
];

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await requireSession();
  // CEO uchun xodimning shaxsiy ko'rinishi kerak emas — executive panelga.
  if (user.role === 'ceo') redirect('/ceo');
  const isEmployee = user.role === 'employee';
  const isManager = user.role === 'manager';

  const [att, salesData, approvalsData, stats, leaderboardRes] = await Promise.all([
    apiFetch<AttendanceResp>('/api/attendance/today'),
    apiFetch<SalesResp>('/api/sales'),
    apiFetch<ApprovalsResp>('/api/approvals'),
    apiFetch<AttendanceStatsResp>('/api/attendance/stats?days=14'),
    apiFetch<LeaderboardData & { ok: boolean }>('/api/reports/leaderboard'),
  ]);

  const leaderboard: LeaderboardData = {
    stores: leaderboardRes.stores ?? [],
    employeesByDivision: leaderboardRes.employeesByDivision ?? [],
    me: leaderboardRes.me ?? { count: 0, rank: null, division: null },
  };

  const today = att.attendance;
  const sales = salesData.sales ?? [];
  const approvals = approvalsData.approvals ?? [];
  const pending = approvals.filter((a) => a.status === 'pending');
  const approved = approvals.filter((a) => a.status === 'approved');
  const nextPending = pending[0];

  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;
  const todayQty = sales.reduce((acc, s) => acc + (s.quantity ?? 0), 0);

  const now = new Date();
  const dateLabel = `${weekdayName(now)} · ${formatDate(now)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[12.5px] text-[color:var(--ink-3)]">{dateLabel}</div>
          <h1 className="mt-1 text-[28px] lg:text-[30px] font-semibold tracking-[-0.025em]">
            Salom, {user.firstName}! 👋
          </h1>
          <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
            {!isEmployee
              ? 'Boshqaruv ko\'rinishi'
              : checkedIn
                ? checkedOut
                  ? `Bugungi smena yakunlandi · ${todayQty} ta savdo`
                  : `Smenadasiz · ${formatTime(today!.checkIn!)} dan beri`
                : 'Smenani boshlash uchun "Keldim" tugmasini bosing'}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/approvals">
            <Button variant="outline" size="sm">
              <Mail />
              Ruxsat so'rash
            </Button>
          </Link>
          {isEmployee && (
            <Link href="/sales">
              <Button size="sm">
                <Plus />
                Savdo qo'shish
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 3-card grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {isEmployee && (
          <>
        {/* Davomat */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-2)]">
              Davomat
            </span>
            {!checkedIn ? (
              <StatusPill tone="amber">Kelmadi</StatusPill>
            ) : checkedOut ? (
              <StatusPill tone="emerald">Yakunlandi</StatusPill>
            ) : (
              <StatusPill tone="accent">Smenada</StatusPill>
            )}
          </div>
          <div className="mt-4 flex gap-5">
            <Time label="Keldim" value={today?.checkIn ? formatTime(today.checkIn) : '—'} />
            <Time
              label={checkedOut ? 'Ketdim' : 'Ketdim'}
              value={today?.checkOut ? formatTime(today.checkOut) : '—'}
              muted={!today?.checkOut}
            />
          </div>
          <div className="mt-4 px-3.5 py-2.5 rounded-[10px] bg-[color:var(--background-2)] text-[12px] text-[color:var(--ink-2)]">
            {today?.penaltyAmount && today.penaltyAmount > 0 ? (
              <span className="text-[color:var(--rose)] font-medium">
                💸 Jarima: {formatMoney(today.penaltyAmount)} so'm
              </span>
            ) : checkedIn ? (
              "Vaqtida keldingiz · jarima yo'q"
            ) : (
              "Smenani boshlash uchun pastdagi tugmani bosing"
            )}
          </div>
          <Link href="/attendance" className="mt-4">
            <Button
              variant={!checkedIn ? 'default' : !checkedOut ? 'destructive' : 'outline'}
              size="lg"
              className="w-full"
            >
              {!checkedIn ? <Clock /> : !checkedOut ? <LogOut /> : <ArrowRight />}
              {!checkedIn ? 'Keldim' : !checkedOut ? 'Ketdim' : 'Davomatga'}
            </Button>
          </Link>
        </Card>

        {/* Savdo — faqat o'zingiz kiritgan yozuvlar */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-2)]">
              Savdo
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[34px] font-semibold tracking-[-0.025em] tabular">{todayQty}</span>
            <span className="text-[12px] text-[color:var(--ink-3)]">dona</span>
          </div>
          <div className="mt-4 px-3.5 py-2.5 rounded-[10px] bg-[color:var(--background-2)] text-[12px] text-[color:var(--ink-2)]">
            {sales.length > 0
              ? `Bugun ${sales.length} ta yozuv qo'shdingiz`
              : "Bugungi savdolaringizni qo'lda kiriting"}
          </div>
          <Link href="/sales" className="mt-4">
            <Button size="lg" className="w-full">
              <Plus />
              Savdo qo'shish
            </Button>
          </Link>
        </Card>
          </>
        )}

        {/* Approvals */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-2)]">
              Ruxsatlar
            </span>
            {pending.length > 0 ? (
              <Badge tone="amber">{pending.length} kutilmoqda</Badge>
            ) : (
              <Badge tone="emerald" dot>
                Bo'sh
              </Badge>
            )}
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[34px] font-semibold tracking-[-0.025em] tabular">
              {pending.length}
            </span>
            <span className="text-[12px] text-[color:var(--ink-3)]">
              kutilmoqda · {approved.length} tasdiqlangan
            </span>
          </div>
          <div className="mt-4 px-3.5 py-2.5 rounded-[10px] bg-[color:var(--background-2)] text-[12px] text-[color:var(--ink-2)]">
            {nextPending
              ? `${nextPending.type === 'late_arrival' ? 'Kech kelish' : 'Erta ketish'} · ${formatDate(nextPending.requestedDate)}`
              : "Hozircha so'rov yo'q"}
          </div>
          <Link href="/approvals" className="mt-4">
            <Button variant="secondary" size="lg" className="w-full">
              <Mail />
              So'rov yuborish
            </Button>
          </Link>
        </Card>
      </div>

      {/* Reyting + 14 kun + qoidalar */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Reyting — savdoga oid; menejer ko'rmaydi. */}
        {!isManager && <LeaderboardCard data={leaderboard} />}

        {/* 14 kunlik davomat — menejer davomat qilmaydi, ko'rinmaydi. */}
        {!isManager && (
          <Card className="p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[13px] font-semibold">So'nggi 14 kun</span>
              <Badge tone="neutral">
                {stats.presentDays}/{stats.totalDays} vaqtida
              </Badge>
            </div>
            <BarStrip presentDays={stats.presentDays} lateDays={stats.lateDays} totalDays={stats.totalDays} />
            <div className="mt-3 flex gap-5 text-[11.5px] text-[color:var(--ink-2)]">
              <Legend color="var(--emerald)" label={`Vaqtida · ${stats.presentDays}`} />
              <Legend color="var(--amber)" label={`Kech · ${stats.lateDays}`} />
              <Legend
                color="var(--border-2)"
                label={`Dam · ${Math.max(0, 14 - stats.totalDays)}`}
              />
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[13px] font-semibold">Qoidalar</span>
            <BookOpen className="size-[15px] text-[color:var(--ink-3)]" />
          </div>
          <div className="space-y-1">
            {RULE_CATS.map((r, i) => (
              <Link
                key={r.slug}
                href={`/rules#${r.slug}`}
                className={`flex items-center gap-2.5 py-2 ${
                  i < RULE_CATS.length - 1 ? 'border-b border-[color:var(--border)]' : ''
                }`}
              >
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="text-[12.5px] font-medium flex-1">{r.label}</span>
                <ArrowRight className="size-3 text-[color:var(--ink-3)]" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Time({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-[color:var(--ink-3)]">{label}</span>
      <span
        className={`font-mono text-[20px] font-semibold tabular ${
          muted ? 'text-[color:var(--ink-3)]' : 'text-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function BarStrip({
  presentDays,
  lateDays,
  totalDays,
}: {
  presentDays: number;
  lateDays: number;
  totalDays: number;
}): React.ReactElement {
  const bars: Array<'present' | 'late' | 'off'> = [];
  for (let i = 0; i < presentDays && bars.length < 14; i++) bars.push('present');
  for (let i = 0; i < lateDays && bars.length < 14; i++) bars.push('late');
  while (bars.length < totalDays && bars.length < 14) bars.push('present');
  while (bars.length < 14) bars.push('off');

  return (
    <div className="flex items-end gap-1.5 h-[100px]">
      {bars.map((s, i) => {
        const h = s === 'off' ? 6 : 40 + (i % 6) * 8;
        const tone =
          s === 'off' ? 'var(--border-2)' : s === 'late' ? 'var(--amber)' : 'var(--emerald)';
        return (
          <div
            key={i}
            className="flex-1 rounded-[4px]"
            style={{ height: `${h}%`, background: tone }}
          />
        );
      })}
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
