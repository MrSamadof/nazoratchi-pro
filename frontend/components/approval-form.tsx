'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Plus } from 'lucide-react';
import { useCreateApprovalMutation } from '@/services/approvalsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';

function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface Props {
  triggerLabel?: string;
}

export function ApprovalForm({ triggerLabel = "Yangi so'rov" }: Props = {}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'late_arrival' | 'early_leave' | 'day_off'>('late_arrival');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [createApproval, { isLoading: submitting }] = useCreateApprovalMutation();

  function reset() {
    setType('late_arrival');
    setDate(todayStr());
    setTime('');
    setReason('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) {
      toast.error('Sabab kamida 3 belgi');
      return;
    }
    try {
      // RTK Query: muvaffaqiyatda 'Approval' keshi invalidatsiya bo'lib,
      // ro'yxat avtomatik qayta yuklanadi (router.refresh kerak emas).
      await createApproval({
        type,
        requestedDate: date,
        requestedTime: type === 'day_off' ? undefined : time,
        reason: reason.trim(),
      }).unwrap();
      toast.success("So'rov yuborildi. Admin javobini kuting.");
      reset();
      setOpen(false);
    } catch (err) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Yuborilmadi';
      toast.error(msg);
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button>
          <Plus />
          {triggerLabel}
        </Button>
      </ModalTrigger>
      <ModalContent
        icon={<Send />}
        iconTone="accent"
        title="Yangi ruxsat so'rovi"
        subtitle="So'rovingiz menejer va CEO ga Telegram orqali yetkaziladi"
        width={480}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" form="approval-form" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              Yuborish
            </Button>
          </div>
        }
      >
        <form id="approval-form" onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
              So&apos;rov turi
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="late_arrival">Kech kelish</SelectItem>
                <SelectItem value="early_leave">Erta ketish</SelectItem>
                <SelectItem value="day_off">Dam olish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={type === 'day_off' ? '' : 'grid sm:grid-cols-2 gap-3'}>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
                {type === 'day_off' ? 'Dam olish kuni' : 'Sana'}
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tabular"
                required
              />
            </div>
            {type !== 'day_off' && (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label
                    htmlFor="time"
                    className="text-[12.5px] font-medium text-[color:var(--ink-2)]"
                  >
                    Vaqt
                  </Label>
                  <span className="text-[11px] text-[color:var(--ink-3)]">ixtiyoriy</span>
                </div>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="09:30"
                  className="tabular"
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="reason"
              className="text-[12.5px] font-medium text-[color:var(--ink-2)]"
            >
              Sabab *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Sababingizni qisqacha yozing"
              rows={3}
              required
            />
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
