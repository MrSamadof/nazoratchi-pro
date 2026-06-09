'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Gift, Inbox, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/ui/status-pill';
import { formatMoney, formatDate } from '@/lib/format';
import {
  useListMyRewardsQuery,
  useListRewardsQuery,
  useDecideRewardMutation,
  type ApiReward,
} from '@/services/rewardsApi';
import { RewardForm } from './reward-form';
import { REWARD_STATUS_META, type Role } from '@/shared/types';

export function RewardsView({
  role,
  currentUserId,
}: {
  role: Role;
  currentUserId: string;
}): React.ReactElement {
  const canManage = role === 'manager' || role === 'ceo';

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-5 items-start">
      <MyRewards canGive={canManage} currentUserId={currentUserId} />
      {canManage && <PendingRewards role={role} />}
    </div>
  );
}

function MyRewards({
  canGive,
  currentUserId,
}: {
  canGive: boolean;
  currentUserId: string;
}): React.ReactElement {
  const { data: rewards = [], isLoading } = useListMyRewardsQuery();
  const total = rewards
    .filter((r) => r.status === 'approved')
    .reduce((s, r) => s + r.amount, 0);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-semibold">Mening rag&apos;batlarim</span>
        <Badge tone="emerald">{formatMoney(total)} so&apos;m</Badge>
      </div>

      <div className="mb-4">
        <RewardForm canGive={canGive} currentUserId={currentUserId} />
      </div>

      {isLoading ? (
        <Loader2 className="size-5 mx-auto my-8 animate-spin text-[color:var(--ink-3)]" />
      ) : rewards.length === 0 ? (
        <Empty text="Hali rag'bat yo'q" />
      ) : (
        <div className="space-y-2.5">
          {rewards.map((r) => (
            <RewardRow key={r.id} reward={r} />
          ))}
        </div>
      )}
    </Card>
  );
}

function PendingRewards({ role }: { role: Role }): React.ReactElement {
  const { data: rewards = [], isLoading } = useListRewardsQuery({ status: 'pending' });
  const [decide, { isLoading: deciding }] = useDecideRewardMutation();
  // Xodim o'ziga miqdorsiz (amount=0) so'ragan rag'batlar uchun tasdiqlovchi
  // belgilaydigan summalar.
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  async function act(r: ApiReward, decision: 'approve' | 'reject') {
    let amount: number | undefined;
    if (decision === 'approve' && r.amount <= 0) {
      amount = Number(amounts[r.id]);
      if (!Number.isFinite(amount) || amount < 1000) {
        toast.error("Summa kamida 1000 so'm");
        return;
      }
    }
    try {
      await decide({ id: r.id, decision, amount }).unwrap();
      toast.success(decision === 'approve' ? 'Tasdiqlandi' : 'Rad etildi');
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Xatolik');
    }
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-semibold">Tasdiqlash kutilmoqda</span>
        <Badge tone="amber">{rewards.length} ta</Badge>
      </div>

      {isLoading ? (
        <Loader2 className="size-5 mx-auto my-8 animate-spin text-[color:var(--ink-3)]" />
      ) : rewards.length === 0 ? (
        <Empty text="Kutilayotgan so'rov yo'q" />
      ) : (
        <div className="space-y-2.5">
          {rewards.map((r) => {
            // Rahbar bergan rag'batni faqat CEO tasdiqlaydi.
            const blocked = r.initiatorRole === 'manager' && role !== 'ceo';
            // Xodim o'ziga so'ragan — miqdor hali belgilanmagan.
            const needsAmount = r.amount <= 0;
            return (
              <div key={r.id} className="p-3.5 rounded-[12px] bg-[color:var(--background-2)]">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold">{r.recipientName ?? '—'}</div>
                    <div className="text-[11.5px] text-[color:var(--ink-3)]">
                      {r.requestedByName ? `So'radi: ${r.requestedByName}` : ''}
                    </div>
                  </div>
                  {needsAmount ? (
                    <Badge tone="amber">Miqdor belgilanmagan</Badge>
                  ) : (
                    <Badge tone="emerald">{formatMoney(r.amount)} so&apos;m</Badge>
                  )}
                </div>
                {r.reason && (
                  <p className="mt-2 text-[12.5px] text-[color:var(--ink-2)]">{r.reason}</p>
                )}
                {blocked ? (
                  <p className="mt-2 text-[11px] text-[color:var(--ink-3)]">
                    Rahbar bergan — CEO tasdiqlaydi
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-2">
                    {needsAmount && (
                      <Input
                        value={amounts[r.id] ?? ''}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [r.id]: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        inputMode="numeric"
                        className="tabular h-9"
                        placeholder="Rag'bat summasi (so'm)"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => act(r, 'approve')} disabled={deciding}>
                        <Check /> Tasdiqlash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(r, 'reject')}
                        disabled={deciding}
                      >
                        <X /> Rad etish
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RewardRow({ reward: r }: { reward: ApiReward }): React.ReactElement {
  const meta = REWARD_STATUS_META[r.status];
  return (
    <div className="p-3.5 rounded-[12px] bg-[color:var(--background-2)]">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="size-8 grid place-items-center rounded-[10px] bg-accent text-[color:var(--primary)]">
            <Gift className="size-4" />
          </span>
          <div>
            <div className="text-[13px] font-semibold tabular">{formatMoney(r.amount)} so&apos;m</div>
            <div className="text-[10.5px] text-[color:var(--ink-3)] tabular">{formatDate(r.date)}</div>
          </div>
        </div>
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      </div>
      {r.reason && (
        <p className="mt-2 text-[12.5px] text-[color:var(--ink-2)] leading-[1.5]">{r.reason}</p>
      )}
      {r.adminComment && (
        <div className="mt-2 px-3 py-2 rounded-[8px] bg-card border text-[11.5px] text-[color:var(--ink-2)]">
          <span className="text-[color:var(--ink-3)] font-medium">Izoh: </span>
          {r.adminComment}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }): React.ReactElement {
  return (
    <div className="text-center py-10 text-[color:var(--ink-3)]">
      <Inbox className="size-7 mx-auto opacity-50 mb-2" />
      <p className="text-[13px]">{text}</p>
    </div>
  );
}
