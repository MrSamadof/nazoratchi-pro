'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Clock, Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import { formatMoney } from '@/lib/format';
import {
  useListPenaltyRulesQuery,
  useCreatePenaltyRuleMutation,
  useUpdatePenaltyRuleMutation,
  useDeletePenaltyRuleMutation,
  type ApiPenaltyRule,
  type PenaltyType,
} from '@/services/penaltyRulesApi';

const TYPE_LABEL: Record<PenaltyType, string> = {
  late_arrival: 'Kech kelish',
  early_leave: 'Erta ketish',
  absence: 'Kelmaslik',
  other: 'Boshqa',
};

const TYPE_OPTIONS: Array<{ value: PenaltyType; label: string }> = [
  { value: 'late_arrival', label: 'Kech kelish' },
  { value: 'early_leave', label: 'Erta ketish' },
  { value: 'absence', label: 'Kelmaslik' },
  { value: 'other', label: 'Boshqa' },
];

/** Daqiqaga bog'liq tur (oraliq ko'rsatiladi)mi? */
function usesRange(type: PenaltyType): boolean {
  return type === 'late_arrival' || type === 'early_leave';
}

function rangeLabel(r: ApiPenaltyRule): string {
  if (!usesRange(r.type)) return TYPE_LABEL[r.type];
  const range = r.maxMinutes ? `${r.minMinutes}–${r.maxMinutes} daq` : `${r.minMinutes}+ daq`;
  return `${TYPE_LABEL[r.type]} · ${range}`;
}

export function PenaltyRulesManager(): React.ReactElement {
  const { data: rules = [], isLoading } = useListPenaltyRulesQuery();
  const [deletePenaltyRule] = useDeletePenaltyRuleMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPenaltyRule | null>(null);
  const [deleting, setDeleting] = useState<ApiPenaltyRule | null>(null);

  async function remove(r: ApiPenaltyRule) {
    try {
      await deletePenaltyRule(r.id).unwrap();
      toast.success("Qoida o'chirildi");
      setDeleting(null);
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? "O'chirib bo'lmadi");
    }
  }

  return (
    <div className="mt-5 space-y-2">
      <div className="flex justify-end">
        <Modal open={createOpen} onOpenChange={setCreateOpen}>
          <ModalTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus />
              Yangi qoida
            </Button>
          </ModalTrigger>
          <RuleFormModal mode="create" onClose={() => setCreateOpen(false)} />
        </Modal>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[color:var(--ink-3)]">
          <Loader2 className="size-5 mx-auto animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <p className="text-[13px] text-[color:var(--ink-3)] py-6 text-center">
          Hozircha qoida yo'q. Yuqoridan yangi qoida qo'shing.
        </p>
      ) : (
        rules.map((r) => {
          const Icon = r.type === 'late_arrival' ? Clock : r.type === 'early_leave' ? Clock : X;
          return (
            <div
              key={r.id}
              className={`flex flex-col gap-3 px-4 py-3 rounded-[10px] bg-[color:var(--background-2)] sm:flex-row sm:items-center ${
                r.isActive ? '' : 'opacity-55'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1 sm:items-center">
              <span className="size-9 grid place-items-center rounded-[9px] bg-card text-[color:var(--ink-2)] border border-[color:var(--border)] shrink-0">
                <Icon className="size-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold truncate">{r.name}</span>
                  {!r.isActive && <Badge tone="neutral">Faolsiz</Badge>}
                </div>
                <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">{rangeLabel(r)}</div>
              </div>
              </div>
              <div className="flex items-center gap-1 justify-between border-t pt-2.5 sm:border-t-0 sm:pt-0 sm:justify-end sm:shrink-0">
              <span className="text-[13px] font-semibold tabular text-[color:var(--ink-1)] whitespace-nowrap mr-1">
                {formatMoney(r.amount)} so'm
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(r)} title="Tahrirlash">
                <Edit2 />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleting(r)}
                title="O'chirish"
              >
                <Trash2 className="text-[color:var(--rose)]" />
              </Button>
              </div>
            </div>
          );
        })
      )}

      {editing && (
        <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <RuleFormModal mode="edit" rule={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}

      {deleting && (
        <Modal open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <ModalContent
            icon={<Trash2 />}
            iconTone="rose"
            title="Qoidani o'chirish?"
            subtitle={`"${deleting.name}" — bu amalni qaytarib bo'lmaydi`}
            width={420}
            footer={
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDeleting(null)}>
                  Bekor qilish
                </Button>
                <Button type="button" variant="destructive" onClick={() => remove(deleting)}>
                  <Trash2 />
                  O'chirish
                </Button>
              </div>
            }
          >
            <div className="px-4 py-3 rounded-[10px] bg-[color:var(--background-2)] text-[13px]">
              {rangeLabel(deleting)} · {formatMoney(deleting.amount)} so'm
            </div>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}

function RuleFormModal({
  mode,
  rule,
  onClose,
}: {
  mode: 'create' | 'edit';
  rule?: ApiPenaltyRule;
  onClose: () => void;
}): React.ReactElement {
  const [name, setName] = useState(rule?.name ?? '');
  const [type, setType] = useState<PenaltyType>(rule?.type ?? 'late_arrival');
  const [minMinutes, setMinMinutes] = useState(String(rule?.minMinutes ?? 0));
  const [maxMinutes, setMaxMinutes] = useState(rule?.maxMinutes != null ? String(rule.maxMinutes) : '');
  const [amount, setAmount] = useState(String(rule?.amount ?? ''));
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);

  const [createRule, { isLoading: creating }] = useCreatePenaltyRuleMutation();
  const [updateRule, { isLoading: updating }] = useUpdatePenaltyRuleMutation();
  const submitting = creating || updating;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Nom kamida 2 belgi');
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("Summani to'g'ri kiriting");
      return;
    }
    const min = usesRange(type) ? Number(minMinutes) || 0 : 0;
    const max = usesRange(type) && maxMinutes.trim() !== '' ? Number(maxMinutes) : null;
    if (max !== null && max < min) {
      toast.error("Yuqori chegara quyi chegaradan kichik bo'lolmaydi");
      return;
    }

    const body = {
      name: name.trim(),
      type,
      minMinutes: min,
      maxMinutes: max,
      amount: amt,
      isActive,
    };

    try {
      if (mode === 'create') {
        await createRule(body).unwrap();
        toast.success("Qoida qo'shildi");
      } else {
        await updateRule({ id: rule!.id, body }).unwrap();
        toast.success('Saqlandi');
      }
      onClose();
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Saqlanmadi');
    }
  }

  return (
    <ModalContent
      icon={mode === 'create' ? <Plus /> : <Edit2 />}
      iconTone={mode === 'create' ? 'emerald' : 'accent'}
      title={mode === 'create' ? 'Yangi jarima qoidasi' : 'Qoidani tahrirlash'}
      subtitle="Davomat avtomatik shu qoidalar bo'yicha hisoblanadi"
      width={480}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form="penalty-rule-form" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {mode === 'create' ? "Qo'shish" : 'Saqlash'}
          </Button>
        </div>
      }
    >
      <form id="penalty-rule-form" onSubmit={submit} className="space-y-3.5">
        <Field label="Nom">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Kechikish 5-15 daq"
            autoFocus
          />
        </Field>

        <Field label="Turi">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PenaltyType)}
            className="flex h-10 w-full rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        {usesRange(type) && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quyi chegara (daq)">
              <Input
                value={minMinutes}
                onChange={(e) => setMinMinutes(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="tabular"
                placeholder="5"
              />
            </Field>
            <Field label="Yuqori chegara (daq)" hint="Bo'sh = chegarasiz (30+)">
              <Input
                value={maxMinutes}
                onChange={(e) => setMaxMinutes(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="tabular"
                placeholder="15"
              />
            </Field>
          </div>
        )}

        <Field label="Summa (so'm)">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            className="tabular"
            placeholder="50000"
          />
        </Field>

        <div className="rounded-[10px] bg-[color:var(--background-2)] p-3 flex items-center gap-2.5">
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold">Faol</div>
            <div className="text-[11px] text-[color:var(--ink-3)]">
              Faolsiz qoida hisob-kitobda ishlatilmaydi
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isActive ? 'bg-primary' : 'bg-[color:var(--border-2)]'
            }`}
            aria-pressed={isActive}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </form>
    </ModalContent>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</Label>
      {children}
      {hint && <div className="text-[11.5px] text-[color:var(--ink-3)]">{hint}</div>}
    </div>
  );
}
