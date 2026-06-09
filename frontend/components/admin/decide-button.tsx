'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';

interface Props {
  endpoint: string;
  decision: 'approve' | 'reject';
  withComment?: boolean;
}

export function DecideButton({
  endpoint,
  decision,
  withComment = false,
}: Props): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');

  const variant = decision === 'approve' ? 'default' : 'destructive';
  const Icon = decision === 'approve' ? Check : X;
  const label = decision === 'approve' ? 'Tasdiqlash' : 'Rad etish';

  const titles = {
    approve: {
      employee: 'Xodimni tasdiqlaysizmi?',
      request: "So'rovni tasdiqlash",
    },
    reject: {
      employee: 'Xodimni rad etasizmi?',
      request: "So'rovni rad etish",
    },
  } as const;

  const subtitles = {
    approve: {
      employee: 'Tasdiqlangach xodim tizimga kira oladi va smena boshlay oladi.',
      request: 'Xodimga Telegram orqali tasdiq xabari yuboriladi.',
    },
    reject: {
      employee: "Rad etilgan xodim tizimga kira olmaydi. Keyin qayta tasdiqlashingiz mumkin.",
      request: "Sabab izohini yozsangiz, xodim ko'radi.",
    },
  } as const;

  const kind = withComment ? 'request' : 'employee';
  const title = titles[decision][kind];
  const subtitle = subtitles[decision][kind];

  async function send() {
    setLoading(true);
    try {
      const body = withComment ? { decision, comment } : null;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Bo'lmadi");
        return;
      }
      toast.success(decision === 'approve' ? 'Tasdiqlandi' : 'Rad etildi');
      setOpen(false);
      setComment('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant={variant} size="sm">
          <Icon />
          {label}
        </Button>
      </ModalTrigger>
      <ModalContent
        icon={<Icon />}
        iconTone={decision === 'approve' ? 'emerald' : 'rose'}
        title={title}
        subtitle={subtitle}
        width={withComment ? 460 : 420}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="button" variant={variant} onClick={send} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Icon />}
              {label}
            </Button>
          </div>
        }
      >
        {withComment ? (
          <div className="space-y-2">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
              Izoh {decision === 'approve' ? '(ixtiyoriy)' : '(tavsiya)'}
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                decision === 'approve' ? 'Misol: ruxsat berildi' : "Sababini qisqacha yozing"
              }
              rows={3}
            />
          </div>
        ) : (
          <p className="text-[13px] text-[color:var(--ink-2)] leading-[1.55]">
            {decision === 'approve'
              ? "Davom etishni xohlaysizmi?"
              : "Davom etishni xohlaysizmi?"}
          </p>
        )}
      </ModalContent>
    </Modal>
  );
}
