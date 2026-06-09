'use client';

import { ArrowDown, CalendarOff, ChevronRight, Clock, Inbox, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { ApprovalForm } from '@/components/approval-form';
import { formatDate, formatDateTime } from '@/lib/format';
import { useListApprovalsQuery } from '@/services/approvalsApi';
import { APPROVAL_TYPE_LABELS } from '@/shared/types';

const statusMeta: Record<string, { label: string; tone: 'emerald' | 'amber' | 'rose' | 'neutral' }> = {
  pending: { label: 'Kutilmoqda', tone: 'amber' },
  approved: { label: 'Tasdiqlandi', tone: 'emerald' },
  rejected: { label: 'Rad etildi', tone: 'rose' },
  expired: { label: "Muddati o'tdi", tone: 'neutral' },
};

export function ApprovalsView(): React.ReactElement {
  const { data: list = [], isLoading } = useListApprovalsQuery();
  const pending = list.filter((a) => a.status === 'pending');
  const approved = list.filter((a) => a.status === 'approved');

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5 items-start">
      {/* Form card */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[14px] font-semibold">Yangi so'rov</span>
          <div className="flex gap-2">
            <Badge tone="amber">{pending.length} kutilmoqda</Badge>
            <Badge tone="emerald">{approved.length} tasdiqlangan</Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <TypeTile icon={<Clock className="size-[18px]" />} label="Kech kelish" sub="Smena boshi" />
          <TypeTile icon={<ArrowDown className="size-[18px]" />} label="Erta ketish" sub="Smena oxiri" />
          <TypeTile icon={<CalendarOff className="size-[18px]" />} label="Dam olish" sub="Butun kun" />
        </div>

        <div className="p-4 rounded-[12px] bg-[color:var(--background-2)]">
          <p className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.55]">
            <b>Eslatma:</b> So'rovingiz Telegram orqali menejer va CEO ga yuboriladi. Tasdiqlangan
            vaqtgacha kelmasangiz/ketmasangiz jarima qo'llanmaydi.
          </p>
          <div className="mt-3">
            <ApprovalForm triggerLabel="So'rov yuborish" />
          </div>
        </div>
      </Card>

      {/* History */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-3.5">
          <span className="text-[14px] font-semibold">So'nggi so'rovlar</span>
          <span className="text-[11.5px] text-[color:var(--ink-3)]">{list.length} ta</span>
        </div>
        {isLoading ? (
          <div className="text-center py-10 text-[color:var(--ink-3)]">
            <Loader2 className="size-5 mx-auto animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-10 text-[color:var(--ink-3)]">
            <Inbox className="size-7 mx-auto opacity-50 mb-2" />
            <p className="text-[13px]">Hech qanday so'rov yo'q</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((a) => {
              const meta = statusMeta[a.status] ?? statusMeta.pending!;
              return (
                <div key={a.id} className="p-3.5 rounded-[12px] bg-[color:var(--background-2)]">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="accent">{APPROVAL_TYPE_LABELS[a.type]}</Badge>
                      <span className="font-mono text-[12px] text-[color:var(--ink-2)] tabular">
                        {formatDate(a.requestedDate)}
                        {a.requestedTime && ` · ${a.requestedTime}`}
                      </span>
                    </div>
                    <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                  </div>
                  {a.reason && (
                    <p className="mt-2 text-[12.5px] text-[color:var(--ink-2)] leading-[1.5]">
                      {a.reason}
                    </p>
                  )}
                  {a.adminComment && (
                    <div className="mt-2 px-3 py-2 rounded-[8px] bg-card border text-[11.5px] text-[color:var(--ink-2)]">
                      <span className="text-[color:var(--ink-3)] font-medium">Admin: </span>
                      {a.adminComment}
                    </div>
                  )}
                  <div className="mt-2 text-[10.5px] text-[color:var(--ink-3)] tabular">
                    Yuborildi: {formatDateTime(a.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function TypeTile({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[color:var(--border-2)] bg-card">
      <span className="size-9 grid place-items-center rounded-[10px] bg-accent text-[color:var(--primary)]">
        {icon}
      </span>
      <div className="leading-tight flex-1 min-w-0">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[10.5px] text-[color:var(--ink-3)]">{sub}</div>
      </div>
      <ChevronRight className="size-3.5 text-[color:var(--ink-3)]" />
    </div>
  );
}
