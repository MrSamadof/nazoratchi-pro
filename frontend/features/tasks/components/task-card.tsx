'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Check, Clock, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Modal, ModalContent } from '@/components/ui/modal';
import { formatDateTime } from '@/lib/format';
import {
  useUpdateTaskStatusMutation,
  useRequestTaskExtensionMutation,
  useDecideTaskExtensionMutation,
  type ApiTask,
  type TaskStatus,
} from '@/services/tasksApi';

const PRIORITY_META: Record<string, { label: string; tone: 'rose' | 'amber' | 'neutral' }> = {
  high: { label: 'Yuqori', tone: 'rose' },
  normal: { label: "O'rta", tone: 'neutral' },
  low: { label: 'Past', tone: 'neutral' },
};

const NEXT_STATUS: Partial<Record<TaskStatus, { to: TaskStatus; label: string }>> = {
  todo: { to: 'in_progress', label: 'Boshlash' },
  in_progress: { to: 'done', label: 'Bajarildi' },
};

export function TaskCard({ task, canManage }: { task: ApiTask; canManage: boolean }): React.ReactElement {
  const [updateStatus] = useUpdateTaskStatusMutation();
  const [decideExt, { isLoading: deciding }] = useDecideTaskExtensionMutation();
  const [extOpen, setExtOpen] = useState(false);

  const pendingExt = task.extensions.filter((e) => e.status === 'pending');
  const next = NEXT_STATUS[task.status];

  async function move(to: TaskStatus) {
    try {
      await updateStatus({ id: task.id, status: to }).unwrap();
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Xatolik');
    }
  }

  async function decide(extId: string, decision: 'approve' | 'reject') {
    try {
      await decideExt({ taskId: task.id, extId, decision }).unwrap();
      toast.success(decision === 'approve' ? 'Muddat surildi' : 'Rad etildi');
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Xatolik');
    }
  }

  return (
    <div className="p-3.5 rounded-[12px] border bg-card space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-snug">{task.title}</div>
          {task.description && (
            <p className="text-[11.5px] text-[color:var(--ink-2)] mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        <Badge tone={PRIORITY_META[task.priority]?.tone ?? 'neutral'}>
          {PRIORITY_META[task.priority]?.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[color:var(--ink-3)]">
        <span className={`inline-flex items-center gap-1 tabular ${task.overdue ? 'text-[color:var(--rose)] font-medium' : ''}`}>
          <CalendarClock className="size-3.5" />
          {formatDateTime(task.deadline)}
        </span>
        {task.overdue && <Badge tone="rose" dot>Muddati o&apos;tdi</Badge>}
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {task.assignees.length}
        </span>
      </div>

      {/* Status harakatlari */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {next && task.status !== 'done' && task.status !== 'cancelled' && (
          <Button size="sm" onClick={() => move(next.to)}>
            <Check /> {next.label}
          </Button>
        )}
        {task.status !== 'done' && task.status !== 'cancelled' && (
          <Button size="sm" variant="outline" onClick={() => setExtOpen(true)}>
            <Clock /> Muddat surish
          </Button>
        )}
        {task.status === 'done' && <Badge tone="emerald" dot>Bajarildi</Badge>}
      </div>

      {/* Kutilayotgan muddat so'rovlari — rahbar/CEO hal qiladi */}
      {pendingExt.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {pendingExt.map((e) => (
            <div key={e.id} className="rounded-[8px] bg-[color:var(--background-2)] p-2.5">
              <div className="text-[11.5px] text-[color:var(--ink-2)]">
                <b>Muddat surish:</b> {formatDateTime(e.requestedDeadline)}
              </div>
              <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5">{e.reason}</div>
              {canManage && (
                <div className="flex gap-1.5 mt-2">
                  <Button size="sm" onClick={() => decide(e.id, 'approve')} disabled={deciding}>
                    <Check /> Tasdiqlash
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(e.id, 'reject')} disabled={deciding}>
                    <X /> Rad etish
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ExtensionModal taskId={task.id} open={extOpen} onOpenChange={setExtOpen} />
    </div>
  );
}

function ExtensionModal({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): React.ReactElement {
  const [deadline, setDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [requestExt, { isLoading }] = useRequestTaskExtensionMutation();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!deadline) { toast.error('Yangi muddatni tanlang'); return; }
    if (reason.trim().length < 3) { toast.error('Sabab kamida 3 belgi'); return; }
    try {
      await requestExt({
        id: taskId,
        requestedDeadline: new Date(deadline).toISOString(),
        reason: reason.trim(),
      }).unwrap();
      toast.success('So\'rov yuborildi');
      setDeadline('');
      setReason('');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Yuborilmadi');
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        icon={<Clock />}
        iconTone="amber"
        title="Muddatni surish"
        subtitle="So'rov CEO va nazoratchiga yuboriladi"
        width={420}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" form="ext-form" disabled={isLoading}>
              Yuborish
            </Button>
          </div>
        }
      >
        <form id="ext-form" onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">Yangi muddat</Label>
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="tabular" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">Sabab</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Nega muddat kerak?" />
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
