'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Gift, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import {
  useListColleaguesQuery,
  useCreateRewardMutation,
} from '@/services/rewardsApi';
import { DIVISION_LABELS } from '@/shared/types';

interface Props {
  /** Rahbar/CEO bo'lsa "berish", aks holda "so'rash". */
  canGive?: boolean;
  /** Joriy foydalanuvchi ID — o'zini ro'yxatdan chiqarish uchun. */
  currentUserId?: string;
}

export function RewardForm({ canGive = false, currentUserId }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Hamkasblar ro'yxati — xodim ham, rahbar ham boshqa xodimni tanlaydi.
  // O'zini ro'yxatda ko'rsatmaymiz (xodim o'ziga rag'bat so'ray olmaydi).
  const { data: allColleagues = [] } = useListColleaguesQuery(undefined, { skip: !open });
  const colleagues = allColleagues.filter((c) => c.id !== currentUserId);
  const [createReward, { isLoading }] = useCreateRewardMutation();

  const verb = canGive ? 'berish' : "so'rash";

  function reset() {
    setRecipientId('');
    setAmount('');
    setReason('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId) {
      toast.error("Rag'bat oluvchini tanlang");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error('Sabab kamida 3 belgi');
      return;
    }
    try {
      if (canGive) {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt < 1000) {
          toast.error("Summa kamida 1000 so'm");
          return;
        }
        await createReward({ recipientId, amount: amt, reason: reason.trim() }).unwrap();
        toast.success('Rag\'bat yuborildi (tasdiqqa)');
      } else {
        // Xodim — oluvchi + sabab. Miqdorni tasdiqlovchi (rahbar/CEO) belgilaydi.
        await createReward({ recipientId, reason: reason.trim() }).unwrap();
        toast.success('So\'rov yuborildi');
      }
      reset();
      setOpen(false);
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Yuborilmadi');
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button>
          <Plus />
          Rag&apos;bat {verb}
        </Button>
      </ModalTrigger>
      <ModalContent
        icon={<Gift />}
        iconTone="emerald"
        title={`Rag'bat ${verb}`}
        subtitle={
          canGive
            ? "Xodimga rag'bat bering — CEO tasdig'idan keyin hisobga olinadi"
            : "Boshqa xodimni tanlang va sababini yozing — miqdorni rahbar belgilaydi"
        }
        width={480}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" form="reward-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Gift />}
              Yuborish
            </Button>
          </div>
        }
      >
        <form id="reward-form" onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
              Kimga
            </Label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="flex h-10 w-full rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— tanlang —</option>
              {colleagues.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                  {c.division ? ` · ${DIVISION_LABELS[c.division]}` : ''}
                  {c.storeName ? ` · ${c.storeName}` : ''}
                </option>
              ))}
            </select>
          </div>

          {canGive && (
            <div className="space-y-1.5">
              <Label htmlFor="reward-amount" className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
                Summa (so&apos;m)
              </Label>
              <Input
                id="reward-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="tabular"
                placeholder="50000"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reward-reason" className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
              Sabab
            </Label>
            <Textarea
              id="reward-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nima uchun rag'bat?"
              rows={3}
            />
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
