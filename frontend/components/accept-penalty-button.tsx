'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';

export function AcceptPenaltyButton(): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/accept-penalty', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Bo'lmadi");
        return;
      }
      toast.success('Jarima qabul qilindi');
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button size="sm" variant="outline">
          <Check />
          Jarimani qabul qilaman
        </Button>
      </ModalTrigger>
      <ModalContent
        icon={<ShieldCheck />}
        iconTone="amber"
        title="Jarimani qabul qilasizmi?"
        subtitle="Tasdiqlagandan so'ng jarima sizning hisobingizdan ushlanadi va orqaga qaytarib bo'lmaydi."
        width={420}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="button" onClick={accept} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Check />}
              Ha, qabul qilaman
            </Button>
          </div>
        }
      >
        <div className="text-[13px] text-[color:var(--ink-2)] leading-[1.55]">
          Smena boshlanishida kech qolganingiz uchun jarima belgilangan. Qoidalar bo&apos;limidan
          batafsil ma&apos;lumot olishingiz mumkin.
        </div>
      </ModalContent>
    </Modal>
  );
}
