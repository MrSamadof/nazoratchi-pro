'use client';

import { Loader2, CalendarCheck } from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { useGetCeoEmployeeAttendanceQuery } from '@/services/ceoAttendanceApi';
import { STATUS_META } from './attendance-monitor';

export function EmployeeAttendanceDialog({
  userId,
  name,
  open,
  onOpenChange,
}: {
  userId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement {
  const { data, isLoading, isError } = useGetCeoEmployeeAttendanceQuery({ userId });

  const employee = data?.employee;
  const totals = data?.totals;
  const days = data?.days ?? [];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        icon={<CalendarCheck />}
        iconTone="accent"
        title={employee?.name ?? name}
        subtitle={
          employee
            ? [employee.storeName, employee.division].filter(Boolean).join(' · ') || undefined
            : undefined
        }
        width={620}
      >
        {isLoading ? (
          <div className="py-12 text-center text-[color:var(--ink-3)]">
            <Loader2 className="size-5 mx-auto animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-[13px] text-[color:var(--rose)]">
            Tarixni yuklab bo&apos;lmadi.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Jami statistika */}
            {totals && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <Totals label="Keldi" value={totals.present} tone="emerald" />
                <Totals label="Kelmadi" value={totals.absent} tone="rose" />
                <Totals label="Kech" value={totals.late} tone="amber" />
                <Totals label="Erta ketdi" value={totals.leftEarly} tone="amber" />
                <Totals label="Dam" value={totals.dayOff} tone="neutral" />
                <Totals
                  label="Jarima"
                  value={totals.totalPenalty > 0 ? formatMoney(totals.totalPenalty) : '0'}
                  tone="rose"
                />
              </div>
            )}

            {/* Kunma-kun */}
            {days.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[color:var(--ink-3)]">
                Davomat yozuvlari topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-[0.04em] text-[color:var(--ink-3)]">
                      <th className="font-medium px-2 py-2">Sana</th>
                      <th className="font-medium px-2 py-2 tabular">Kelgan</th>
                      <th className="font-medium px-2 py-2 tabular">Ketgan</th>
                      <th className="font-medium px-2 py-2">Holat</th>
                      <th className="font-medium px-2 py-2 text-right tabular">Jarima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((d) => {
                      const meta = STATUS_META[d.status];
                      return (
                        <tr key={d.date} className="border-b last:border-b-0">
                          <td className="px-2 py-2 tabular">{formatDate(d.date)}</td>
                          <td className="px-2 py-2 tabular text-[color:var(--ink-2)]">
                            {d.checkIn ? formatTime(d.checkIn) : '—'}
                          </td>
                          <td className="px-2 py-2 tabular text-[color:var(--ink-2)]">
                            {d.checkOut ? formatTime(d.checkOut) : '—'}
                          </td>
                          <td className="px-2 py-2">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                          <td className="px-2 py-2 text-right tabular">
                            {d.penaltyAmount > 0 ? (
                              <span className="text-[color:var(--rose)] font-medium">
                                {formatMoney(d.penaltyAmount)}
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
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

function Totals({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
}): React.ReactElement {
  const color =
    tone === 'emerald'
      ? 'var(--emerald)'
      : tone === 'amber'
        ? 'var(--amber-ink)'
        : tone === 'rose'
          ? 'var(--rose)'
          : 'var(--foreground)';
  return (
    <div className="rounded-[10px] bg-[color:var(--background-2)] px-2.5 py-2 text-center">
      <div className="text-[16px] font-semibold tabular" style={{ color }}>
        {value}
      </div>
      <div className="text-[10.5px] text-[color:var(--ink-3)] mt-0.5">{label}</div>
    </div>
  );
}
