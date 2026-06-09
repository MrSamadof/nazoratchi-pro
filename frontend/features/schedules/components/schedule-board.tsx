'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, ArrowLeftRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent } from '@/components/ui/modal';
import {
  useGetWeekScheduleQuery,
  useSetShiftMutation,
  useSwapShiftMutation,
  type ScheduleEntry,
} from '@/services/schedulesApi';
import { DIVISION_LABELS, SHIFT_META, type ShiftType } from '@/shared/types';

interface ScheduleEmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
}

interface StoreOption {
  id: string;
  name: string;
}

const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya'];
const SHIFT_ORDER: ShiftType[] = ['morning', 'evening', 'flexible', 'day_off'];

const SHIFT_CELL_CLASS: Record<ShiftType, string> = {
  morning: 'bg-blue-50 text-blue-700 border-blue-200',
  evening: 'bg-amber-50 text-amber-700 border-amber-200',
  flexible: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  day_off: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  custom: 'bg-violet-50 text-violet-700 border-violet-200',
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOf(date: Date): Date {
  const x = new Date(date);
  const dow = (x.getDay() + 6) % 7; // 0 = Dushanba
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(date: Date, n: number): Date {
  const x = new Date(date);
  x.setDate(x.getDate() + n);
  return x;
}

function ddMM(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ScheduleBoard({ stores }: { stores: StoreOption[] }): React.ReactElement {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));

  const weekStartStr = ymd(weekStart);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const todayStr = ymd(new Date());

  const { data, isLoading, isFetching, isError } = useGetWeekScheduleQuery(
    { storeId, weekStart: weekStartStr },
    { skip: !storeId },
  );
  const [setShift, { isLoading: saving }] = useSetShiftMutation();
  const [swapOpen, setSwapOpen] = useState(false);

  // Tez qidirish uchun: `${userId}:${date}` → ScheduleEntry
  const byKey = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const s of data?.schedules ?? []) map.set(`${s.userId}:${s.date}`, s);
    return map;
  }, [data]);

  function onPick(userId: string, date: string, shiftType: ShiftType) {
    if (!storeId) return;
    void setShift({ userId, storeId, date, shiftType, weekStart: weekStartStr });
  }

  const employees = data?.employees ?? [];

  return (
    <Card className="p-4 lg:p-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[color:var(--ink-2)]" />
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="h-9 rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {stores.length === 0 && <option value="">Do'kon yo'q</option>}
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {isFetching && <Loader2 className="size-3.5 animate-spin text-[color:var(--ink-3)]" />}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSwapOpen(true)}
            disabled={!storeId || employees.length < 2}
            title="Ikki xodimning shu kungi smenasini almashtirish"
          >
            <ArrowLeftRight />
            Almashtirish
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft />
          </Button>
          <span className="text-[12.5px] font-medium tabular px-2 min-w-[150px] text-center">
            {ddMM(days[0]!)} – {ddMM(days[6]!)}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>
            Bu hafta
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {SHIFT_ORDER.map((s) => (
          <span
            key={s}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border text-[11px] font-medium ${SHIFT_CELL_CLASS[s]}`}
          >
            {SHIFT_META[s].label}
            {SHIFT_META[s].startTime && (
              <span className="opacity-70 tabular">{SHIFT_META[s].short}</span>
            )}
          </span>
        ))}
      </div>

      {isError ? (
        <div className="text-center py-10 text-[13px] text-[color:var(--rose)]">
          Jadvalni yuklab bo'lmadi.
        </div>
      ) : isLoading ? (
        <div className="text-center py-10 text-[color:var(--ink-3)]">
          <Loader2 className="size-5 mx-auto animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-10 text-[13px] text-[color:var(--ink-3)]">
          Bu do'konda xodim yo'q.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            {/* Header */}
            <div
              className="grid items-center gap-1.5 mb-1.5"
              style={{ gridTemplateColumns: '180px repeat(7, 1fr)' }}
            >
              <div className="text-[11px] font-semibold text-[color:var(--ink-3)] uppercase tracking-wide px-1">
                Xodim
              </div>
              {days.map((d, i) => {
                const isToday = ymd(d) === todayStr;
                return (
                  <div
                    key={i}
                    className={`text-center py-1 rounded-[6px] ${
                      isToday ? 'bg-foreground text-background' : ''
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{WEEKDAYS[i]}</div>
                    <div
                      className={`text-[10.5px] tabular ${
                        isToday ? 'opacity-80' : 'text-[color:var(--ink-3)]'
                      }`}
                    >
                      {ddMM(d)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="grid items-center gap-1.5"
                  style={{ gridTemplateColumns: '180px repeat(7, 1fr)' }}
                >
                  <div className="min-w-0 px-1">
                    <div className="text-[12.5px] font-medium truncate">
                      {`${emp.lastName ?? ''} ${emp.firstName}`.trim()}
                    </div>
                    {emp.division && (
                      <Badge tone="outline">{DIVISION_LABELS[emp.division]}</Badge>
                    )}
                  </div>
                  {days.map((d, i) => {
                    const dateStr = ymd(d);
                    const entry = byKey.get(`${emp.id}:${dateStr}`);
                    return (
                      <ShiftCell
                        key={i}
                        value={(entry?.shiftType as ShiftType | undefined) ?? null}
                        disabled={saving}
                        onPick={(s) => onPick(emp.id, dateStr, s)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal open={swapOpen} onOpenChange={setSwapOpen}>
        {swapOpen && (
          <SwapModal
            employees={employees}
            days={days}
            todayStr={todayStr}
            byKey={byKey}
            storeId={storeId}
            weekStart={weekStartStr}
            onClose={() => setSwapOpen(false)}
          />
        )}
      </Modal>
    </Card>
  );
}

function SwapModal({
  employees,
  days,
  todayStr,
  byKey,
  storeId,
  weekStart,
  onClose,
}: {
  employees: ScheduleEmployeeRow[];
  days: Date[];
  todayStr: string;
  byKey: Map<string, ScheduleEntry>;
  storeId: string;
  weekStart: string;
  onClose: () => void;
}): React.ReactElement {
  const dayOptions = useMemo(() => days.map((d) => ymd(d)), [days]);
  const [date, setDate] = useState(() =>
    dayOptions.includes(todayStr) ? todayStr : (dayOptions[0] ?? ''),
  );
  const [userA, setUserA] = useState('');
  const [userB, setUserB] = useState('');
  const [swap, { isLoading }] = useSwapShiftMutation();

  function shiftLabel(userId: string): string {
    if (!userId) return '—';
    const entry = byKey.get(`${userId}:${date}`);
    return entry ? SHIFT_META[entry.shiftType as ShiftType].label : 'Smena yo‘q';
  }

  const sameUser = userA !== '' && userA === userB;
  const bothEmpty =
    !!userA &&
    !!userB &&
    !byKey.get(`${userA}:${date}`) &&
    !byKey.get(`${userB}:${date}`);
  const canSubmit = !!date && !!userA && !!userB && !sameUser && !bothEmpty && !isLoading;

  async function submit(): Promise<void> {
    if (!canSubmit) return;
    try {
      await swap({ userA, userB, date, storeId, weekStart }).unwrap();
      toast.success('Smena almashtirildi');
      onClose();
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Almashtirib bo‘lmadi');
    }
  }

  const empOptions = employees.map((e) => ({
    value: e.id,
    label: `${e.lastName ?? ''} ${e.firstName}`.trim(),
  }));

  return (
    <ModalContent
      icon={<ArrowLeftRight />}
      iconTone="accent"
      title="Smena almashinuvi"
      subtitle="Ikki xodimning tanlangan kundagi smenasi o‘rin almashadi"
      width={460}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {isLoading && <Loader2 className="animate-spin" />}
            <ArrowLeftRight />
            Almashtirish
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <SwapField label="Kun">
          <SwapSelect
            value={date}
            onChange={setDate}
            options={days.map((d) => ({
              value: ymd(d),
              label: `${WEEKDAYS[(d.getDay() + 6) % 7]} · ${ddMM(d)}`,
            }))}
          />
        </SwapField>

        <div className="grid grid-cols-2 gap-3">
          <SwapField label="1-xodim" hint={shiftLabel(userA)}>
            <SwapSelect
              value={userA}
              onChange={setUserA}
              options={[{ value: '', label: 'Tanlang' }, ...empOptions]}
            />
          </SwapField>
          <SwapField label="2-xodim" hint={shiftLabel(userB)}>
            <SwapSelect
              value={userB}
              onChange={setUserB}
              options={[{ value: '', label: 'Tanlang' }, ...empOptions]}
            />
          </SwapField>
        </div>

        {sameUser && (
          <div className="text-[12px] text-[color:var(--rose)]">
            Ikki xil xodim tanlang.
          </div>
        )}
        {bothEmpty && (
          <div className="text-[12px] text-[color:var(--rose)]">
            Kamida bittasida smena belgilangan bo‘lishi kerak.
          </div>
        )}
      </div>
    </ModalContent>
  );
}

function SwapField({
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
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</span>
        {hint && <span className="text-[11px] text-[color:var(--ink-3)] truncate">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SwapSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}): React.ReactElement {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 py-2 text-[13.5px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ShiftCell({
  value,
  disabled,
  onPick,
}: {
  value: ShiftType | null;
  disabled?: boolean;
  onPick: (s: ShiftType) => void;
}): React.ReactElement {
  const cls = value
    ? SHIFT_CELL_CLASS[value]
    : 'bg-[color:var(--background-2)] text-[color:var(--ink-3)] border-[color:var(--border-2)] border-dashed';

  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onPick(e.target.value as ShiftType)}
      className={`h-10 w-full rounded-[8px] border px-1.5 text-[11.5px] font-medium text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${cls}`}
      title={value ? SHIFT_META[value].label : 'Smena belgilanmagan'}
    >
      {!value && <option value="" disabled hidden>—</option>}
      {SHIFT_ORDER.map((s) => (
        <option key={s} value={s}>
          {SHIFT_META[s].label}
          {SHIFT_META[s].short && SHIFT_META[s].startTime ? ` (${SHIFT_META[s].short})` : ''}
        </option>
      ))}
    </select>
  );
}
