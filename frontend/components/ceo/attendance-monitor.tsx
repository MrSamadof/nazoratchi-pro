'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CalendarOff,
  Clock,
  Loader2,
  LogOut,
  TriangleAlert,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, formatTime } from '@/lib/format';
import {
  useGetCeoAttendanceDayQuery,
  type AttendanceStatus,
  type RosterRow,
} from '@/services/ceoAttendanceApi';
import { EmployeeAttendanceDialog } from './employee-attendance-dialog';

/** Asia/Tashkent (UTC+5) bo'yicha bugungi sana — YYYY-MM-DD. */
function tashkentToday(): string {
  const now = new Date();
  const tz = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return tz.toISOString().slice(0, 10);
}

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; tone: 'emerald' | 'amber' | 'rose' | 'neutral' | 'accent' }
> = {
  present: { label: 'Keldi', tone: 'emerald' },
  late: { label: 'Kech qoldi', tone: 'amber' },
  left_early: { label: 'Erta ketdi', tone: 'amber' },
  absent: { label: 'Kelmadi', tone: 'rose' },
  day_off: { label: 'Dam olishda', tone: 'accent' },
  not_checked_in: { label: 'Hali kelmadi', tone: 'neutral' },
};

export function AttendanceMonitor(): React.ReactElement {
  const [date, setDate] = useState<string>(tashkentToday());
  const [selected, setSelected] = useState<RosterRow | null>(null);

  const { data, isLoading, isFetching, isError } = useGetCeoAttendanceDayQuery({ date });

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-5">
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <label className="text-[13px] font-medium text-[color:var(--ink-2)]">Sana</label>
        <input
          type="date"
          value={date}
          max={tashkentToday()}
          onChange={(e) => setDate(e.target.value || tashkentToday())}
          className="h-9 rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 text-[13.5px] tabular text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isFetching && <Loader2 className="size-4 animate-spin text-[color:var(--ink-3)]" />}
      </Card>

      {/* Stat kartalar */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Keldi"
          value={summary?.present ?? '—'}
          tone="emerald"
          icon={<UserCheck />}
        />
        <StatCard label="Kelmadi" value={summary?.absent ?? '—'} tone="rose" icon={<UserX />} />
        <StatCard label="Kech qoldi" value={summary?.late ?? '—'} tone="amber" icon={<Clock />} />
        <StatCard
          label="Erta ketdi"
          value={summary?.leftEarly ?? '—'}
          tone="amber"
          icon={<LogOut />}
        />
        <StatCard
          label="Jarimada"
          value={summary?.fined ?? '—'}
          tone="rose"
          icon={<TriangleAlert />}
          foot={
            summary && summary.totalPenalty > 0
              ? `Jami: ${formatMoney(summary.totalPenalty)} so'm`
              : undefined
          }
        />
        <StatCard
          label="Dam olishda"
          value={summary?.onDayOff ?? '—'}
          tone="accent"
          icon={<CalendarOff />}
        />
      </div>

      {/* Xodimlar jadvali */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[color:var(--ink-3)]">
            <Loader2 className="size-5 mx-auto animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-[13px] text-[color:var(--rose)] flex flex-col items-center gap-2">
            <AlertCircle className="size-5" />
            Ma&apos;lumotni yuklab bo&apos;lmadi. Qayta urinib ko&apos;ring.
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[color:var(--ink-3)]">
            Bu kun uchun xodimlar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b text-left text-[11.5px] uppercase tracking-[0.04em] text-[color:var(--ink-3)]">
                  <th className="font-medium px-4 py-3">Ism</th>
                  <th className="font-medium px-4 py-3">Do&apos;kon</th>
                  <th className="font-medium px-4 py-3 tabular">Kelgan</th>
                  <th className="font-medium px-4 py-3 tabular">Ketgan</th>
                  <th className="font-medium px-4 py-3">Holat</th>
                  <th className="font-medium px-4 py-3 text-right tabular">Jarima</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = STATUS_META[row.status];
                  return (
                    <tr
                      key={row.userId}
                      onClick={() => setSelected(row)}
                      className="border-b last:border-b-0 cursor-pointer hover:bg-[color:var(--background-2)]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-[color:var(--ink-2)]">
                        {row.storeName ?? '—'}
                      </td>
                      <td className="px-4 py-3 tabular text-[color:var(--ink-2)]">
                        {row.checkIn ? formatTime(row.checkIn) : '—'}
                      </td>
                      <td className="px-4 py-3 tabular text-[color:var(--ink-2)]">
                        {row.checkOut ? formatTime(row.checkOut) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        {row.penaltyAmount > 0 ? (
                          <span className="text-[color:var(--rose)] font-medium">
                            {formatMoney(row.penaltyAmount)}
                          </span>
                        ) : (
                          <span className="text-[color:var(--ink-3)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <EmployeeAttendanceDialog
          userId={selected.userId}
          name={selected.name}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </div>
  );
}

export { STATUS_META };
