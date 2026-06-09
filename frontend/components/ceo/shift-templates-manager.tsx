'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useGetShiftsConfigQuery,
  useUpdateShiftsConfigMutation,
  type ShiftTemplates,
} from '@/services/shiftsApi';

const ROWS: Array<{ key: keyof ShiftTemplates; title: string }> = [
  { key: 'morning', title: 'Ertalabki' },
  { key: 'evening', title: 'Kechki' },
  { key: 'flexible', title: "O'zgaruvchan" },
];

export function ShiftTemplatesManager(): React.ReactElement {
  const { data, isLoading } = useGetShiftsConfigQuery();
  const [save, { isLoading: saving }] = useUpdateShiftsConfigMutation();
  const [draft, setDraft] = useState<ShiftTemplates | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  async function submit() {
    if (!draft) return;
    for (const key of ['morning', 'evening'] as const) {
      const t = draft[key];
      if (!t.startTime || !t.endTime) {
        toast.error(`${key === 'morning' ? 'Ertalabki' : 'Kechki'} smena vaqti to'liq emas`);
        return;
      }
      if (t.startTime >= t.endTime) {
        toast.error("Boshlanish vaqti tugashdan oldin bo'lishi kerak");
        return;
      }
    }
    try {
      await save(draft).unwrap();
      toast.success('Smena soatlari saqlandi');
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Saqlanmadi');
    }
  }

  function setTime(key: keyof ShiftTemplates, field: 'startTime' | 'endTime', value: string) {
    setDraft((d) => (d ? { ...d, [key]: { ...d[key], [field]: value || null } } : d));
  }

  return (
    <Card className="p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="size-4 text-[color:var(--ink-2)]" />
        <h2 className="text-[14px] font-semibold">Smena soatlari</h2>
      </div>
      <p className="text-[12px] text-[color:var(--ink-3)] mb-4">
        Bu yerdagi o'zgarish shu smenaga biriktirilgan barcha xodimlarga ta'sir qiladi.
        O'zgaruvchan smenada vaqt majburiy emas.
      </p>

      {isLoading || !draft ? (
        <div className="py-8 text-center">
          <Loader2 className="size-5 mx-auto animate-spin text-[color:var(--ink-3)]" />
        </div>
      ) : (
        <div className="space-y-3">
          {ROWS.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
              <div className="text-[13px] font-medium">{row.title}</div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[color:var(--ink-3)]">Boshlanish</Label>
                <Input
                  type="time"
                  value={draft[row.key].startTime ?? ''}
                  onChange={(e) => setTime(row.key, 'startTime', e.target.value)}
                  className="tabular w-[130px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[color:var(--ink-3)]">Tugash</Label>
                <Input
                  type="time"
                  value={draft[row.key].endTime ?? ''}
                  onChange={(e) => setTime(row.key, 'endTime', e.target.value)}
                  className="tabular w-[130px]"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Saqlash
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
