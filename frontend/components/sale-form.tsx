'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';

interface SaleFormProps {
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'soft';
}

export function SaleForm({
  triggerLabel = 'Yangi savdo',
  triggerVariant = 'default',
}: SaleFormProps = {}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setQuantity('');
    setNotes('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      toast.error("Soni kamida 1 bo'lishi kerak");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Saqlanmadi');
        return;
      }
      toast.success("Savdo qo'shildi");
      reset();
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant={triggerVariant}>
          <Plus />
          {triggerLabel}
        </Button>
      </ModalTrigger>
      <ModalContent
        icon={<ShoppingCart />}
        iconTone="emerald"
        title="Yangi savdo qo'shish"
        subtitle="Kun davomida bir nechta yozuv qo'shsangiz ham bo'ladi"
        width={460}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" form="sale-form" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              Qo&apos;shish
            </Button>
          </div>
        }
      >
        <form id="sale-form" onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="qty" className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
              Mahsulot soni *
            </Label>
            <Input
              id="qty"
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="15"
              className="tabular"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label
                htmlFor="notes"
                className="text-[12.5px] font-medium text-[color:var(--ink-2)]"
              >
                Izoh
              </Label>
              <span className="text-[11px] text-[color:var(--ink-3)]">ixtiyoriy</span>
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masalan: katta klient buyurtma berdi"
              rows={2}
            />
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
