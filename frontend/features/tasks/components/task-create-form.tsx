'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import { useCreateTaskMutation, type AssigneeType, type TaskPriority } from '@/services/tasksApi';
import { useListColleaguesQuery } from '@/services/rewardsApi';
import { useListStoresQuery } from '@/services/storesApi';
import { DIVISION_LABELS } from '@/shared/types';

const selectCls =
  'flex h-10 w-full rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function TaskCreateForm(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeType, setAssigneeType] = useState<AssigneeType>('user');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [targetDivision, setTargetDivision] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');

  const { data: colleagues = [] } = useListColleaguesQuery(undefined, { skip: !open });
  const { data: stores = [] } = useListStoresQuery(undefined, { skip: !open });
  const [createTask, { isLoading }] = useCreateTaskMutation();

  function reset() {
    setTitle('');
    setDescription('');
    setAssigneeType('user');
    setAssignees([]);
    setTargetDivision('');
    setTargetStoreId('');
    setDeadline('');
    setPriority('normal');
  }

  function toggleAssignee(id: string) {
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) { toast.error('Sarlavha kamida 3 belgi'); return; }
    if (!deadline) { toast.error('Tugash muddatini tanlang'); return; }
    if (assigneeType === 'user' && assignees.length === 0) { toast.error('Kamida bitta xodim tanlang'); return; }
    if (assigneeType === 'division' && !targetDivision) { toast.error("Bo'lim tanlang"); return; }
    if (assigneeType === 'store' && !targetStoreId) { toast.error("Do'kon tanlang"); return; }

    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeType,
        assignees: assigneeType === 'user' ? assignees : undefined,
        targetDivision: assigneeType === 'division' ? (targetDivision as 'dubai_house' | 'amir') : null,
        targetStoreId: assigneeType === 'store' ? targetStoreId : null,
        deadline: new Date(deadline).toISOString(),
        priority,
      }).unwrap();
      toast.success('Topshiriq yaratildi');
      reset();
      setOpen(false);
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Yaratilmadi');
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button>
          <Plus />
          Yangi topshiriq
        </Button>
      </ModalTrigger>
      <ModalContent
        icon={<ClipboardList />}
        iconTone="accent"
        title="Yangi topshiriq"
        subtitle="Shaxs, bo'lim, do'kon yoki hammaga topshiriq bering"
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" form="task-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
              Yaratish
            </Button>
          </div>
        }
      >
        <form id="task-form" onSubmit={submit} className="space-y-3.5">
          <Field label="Sarlavha">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Vitrinani yangilash" />
          </Field>
          <Field label="Tavsif" optional>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kimga">
              <select value={assigneeType} onChange={(e) => setAssigneeType(e.target.value as AssigneeType)} className={selectCls}>
                <option value="user">Tanlangan xodimlar</option>
                <option value="division">Bo&apos;lim</option>
                <option value="store">Do&apos;kon</option>
                <option value="all">Hamma</option>
              </select>
            </Field>
            <Field label="Muhimligi">
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectCls}>
                <option value="low">Past</option>
                <option value="normal">O&apos;rta</option>
                <option value="high">Yuqori</option>
              </select>
            </Field>
          </div>

          {assigneeType === 'division' && (
            <Field label="Bo'lim">
              <select value={targetDivision} onChange={(e) => setTargetDivision(e.target.value)} className={selectCls}>
                <option value="">— tanlang —</option>
                <option value="dubai_house">{DIVISION_LABELS.dubai_house}</option>
                <option value="amir">{DIVISION_LABELS.amir}</option>
              </select>
            </Field>
          )}

          {assigneeType === 'store' && (
            <Field label="Do'kon">
              <select value={targetStoreId} onChange={(e) => setTargetStoreId(e.target.value)} className={selectCls}>
                <option value="">— tanlang —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          )}

          {assigneeType === 'user' && (
            <Field label={`Xodimlar (${assignees.length})`}>
              <div className="max-h-[180px] overflow-y-auto rounded-[10px] border border-[color:var(--border-2)] divide-y">
                {colleagues.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[color:var(--background-2)]">
                    <input
                      type="checkbox"
                      checked={assignees.includes(c.id)}
                      onChange={() => toggleAssignee(c.id)}
                      className="size-4 accent-[color:var(--primary)]"
                    />
                    <span className="text-[12.5px]">{c.fullName}</span>
                    {c.storeName && <span className="text-[11px] text-[color:var(--ink-3)]">· {c.storeName}</span>}
                  </label>
                ))}
              </div>
            </Field>
          )}

          <Field label="Tugash muddati">
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="tabular" />
          </Field>
        </form>
      </ModalContent>
    </Modal>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</Label>
        {optional && <span className="text-[11px] text-[color:var(--ink-3)]">ixtiyoriy</span>}
      </div>
      {children}
    </div>
  );
}
