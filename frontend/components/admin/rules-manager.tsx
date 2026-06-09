'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  BookOpen,
  Briefcase,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import { apiFetchClient } from '@/lib/api-client';

export interface Rule {
  id: string;
  title: string;
  category: string;
  content: string;
  order: number;
  isActive: boolean;
}

interface Props {
  initialRules: Rule[];
}

const CATEGORIES = [
  { slug: 'general', label: 'Umumiy', icon: Info },
  { slug: 'work_hours', label: 'Ish vaqti', icon: Clock },
  { slug: 'attendance', label: 'Davomat', icon: Briefcase },
  { slug: 'sales', label: 'Savdo', icon: ReceiptText },
  { slug: 'conduct', label: 'Xulq-atvor', icon: Users },
  { slug: 'penalties', label: 'Jarimalar', icon: Wallet },
];

export function RulesManager({ initialRules }: Props): React.ReactElement {
  const router = useRouter();
  const [activeCat, setActiveCat] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);

  const visible = useMemo(() => {
    return activeCat === 'all'
      ? initialRules
      : initialRules.filter((r) => r.category === activeCat);
  }, [initialRules, activeCat]);

  const byCatCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of initialRules) m.set(r.category, (m.get(r.category) ?? 0) + 1);
    return m;
  }, [initialRules]);

  function refresh() {
    router.refresh();
  }

  async function toggleActive(r: Rule) {
    const res = await apiFetchClient<{ ok: boolean; error?: string }>(
      `/api/rules/${r.id}`,
      { method: 'PATCH', body: { isActive: !r.isActive } },
    );
    if (!res.data.ok) {
      toast.error(res.data.error ?? "Oʻzgartirib boʻlmadi");
      return;
    }
    toast.success(r.isActive ? "Yashirildi" : "Faollashtirildi");
    refresh();
  }

  return (
    <>
      <Card className="p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-[color:var(--ink-2)]" />
            <h2 className="text-[14px] font-semibold">
              Qoidalar ({visible.length})
            </h2>
          </div>
          <Modal open={createOpen} onOpenChange={setCreateOpen}>
            <ModalTrigger asChild>
              <Button>
                <Plus />
                Yangi qoida
              </Button>
            </ModalTrigger>
            <RuleFormModal
              mode="create"
              onClose={() => setCreateOpen(false)}
              onSuccess={() => {
                setCreateOpen(false);
                refresh();
              }}
            />
          </Modal>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <FilterChip
            active={activeCat === 'all'}
            onClick={() => setActiveCat('all')}
            count={initialRules.length}
          >
            Hammasi
          </FilterChip>
          {CATEGORIES.map((c) => {
            const count = byCatCount.get(c.slug) ?? 0;
            if (count === 0 && activeCat !== c.slug) return null;
            return (
              <FilterChip
                key={c.slug}
                active={activeCat === c.slug}
                onClick={() => setActiveCat(c.slug)}
                count={count}
              >
                {c.label}
              </FilterChip>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-[color:var(--ink-3)]">
            Hozircha qoida yoʻq. Yangi qoʻshish uchun yuqoridagi tugmani bosing.
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((r) => {
              const cat =
                CATEGORIES.find((c) => c.slug === r.category) ?? CATEGORIES[0]!;
              const Icon = cat.icon;
              return (
                <div
                  key={r.id}
                  className={`p-4 rounded-[12px] border bg-card flex items-start gap-3 ${
                    r.isActive ? '' : 'opacity-60'
                  }`}
                >
                  <span className="size-9 grid place-items-center rounded-[10px] bg-accent text-[color:var(--primary)] shrink-0">
                    <Icon className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-semibold">{r.title}</span>
                      <Badge tone="neutral">{cat.label}</Badge>
                      {!r.isActive && <Badge tone="rose">Yashirilgan</Badge>}
                      <span className="font-mono text-[10.5px] text-[color:var(--ink-3)] tabular ml-auto">
                        #{r.order}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.55] mt-1.5">
                      {r.content}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(r)}
                      title={r.isActive ? "Yashirish" : "Faollashtirish"}
                    >
                      {r.isActive ? <EyeOff /> : <Eye />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
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
            })}
          </div>
        )}
      </Card>

      {editing && (
        <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <RuleFormModal
            mode="edit"
            rule={editing}
            onClose={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}

      {deleting && (
        <Modal open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <DeleteConfirm
            rule={deleting}
            onClose={() => setDeleting(null)}
            onSuccess={() => {
              setDeleting(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] text-[12.5px] font-medium transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'bg-[color:var(--background-2)] text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)]/80'
      }`}
    >
      {children}
      <span
        className={`text-[11px] tabular ${
          active ? 'opacity-70' : 'text-[color:var(--ink-3)]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function RuleFormModal({
  mode,
  rule,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  rule?: Rule;
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactElement {
  const [title, setTitle] = useState(rule?.title ?? '');
  const [category, setCategory] = useState<string>(rule?.category ?? 'general');
  const [content, setContent] = useState(rule?.content ?? '');
  const [order, setOrder] = useState<string>(String(rule?.order ?? 0));
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error("Sarlavha kamida 2 belgi");
      return;
    }
    if (content.trim().length < 3) {
      toast.error("Matn juda qisqa");
      return;
    }
    setSubmitting(true);
    const body = {
      title: title.trim(),
      category,
      content: content.trim(),
      order: parseInt(order || '0', 10),
      isActive,
    };
    const res =
      mode === 'create'
        ? await apiFetchClient<{ ok: boolean; error?: string }>('/api/rules', {
            method: 'POST',
            body,
          })
        : await apiFetchClient<{ ok: boolean; error?: string }>(`/api/rules/${rule!.id}`, {
            method: 'PATCH',
            body,
          });
    setSubmitting(false);
    if (!res.data.ok) {
      toast.error(res.data.error ?? "Saqlanmadi");
      return;
    }
    toast.success(mode === 'create' ? "Qoʻshildi" : "Saqlandi");
    onSuccess();
  }

  return (
    <ModalContent
      icon={mode === 'create' ? <Plus /> : <Edit2 />}
      iconTone={mode === 'create' ? 'emerald' : 'accent'}
      title={mode === 'create' ? "Yangi qoida qo'shish" : "Qoidani tahrirlash"}
      subtitle="Xodimlar /rules sahifasida shu qoidalarni koʻradi"
      width={520}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form="rule-form" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {mode === 'create' ? "Qo'shish" : 'Saqlash'}
          </Button>
        </div>
      }
    >
      <form id="rule-form" onSubmit={submit} className="space-y-3.5">
        <Field label="Sarlavha">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Smena boshlanishi"
            autoFocus
          />
        </Field>

        <Field label="Kategoriya">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 py-2 text-[13.5px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Matn" hint="Aniq va qisqa yozing, xodimlar har kuni koʻradi.">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Smena 09:00 da boshlanadi. 08:50 dan 09:05 gacha 'Keldim' ni belgilang."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tartib" hint="Kichik raqam — yuqorida koʻrinadi">
            <Input
              type="number"
              inputMode="numeric"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="0"
              className="tabular"
            />
          </Field>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">Holat</Label>
            <div className="flex items-center justify-between h-10 px-3 rounded-[10px] bg-[color:var(--background-2)]">
              <span className="text-[12.5px] text-[color:var(--ink-2)]">
                {isActive ? 'Faol' : 'Yashirilgan'}
              </span>
              <Toggle on={isActive} onChange={setIsActive} />
            </div>
          </div>
        </div>
      </form>
    </ModalContent>
  );
}

function DeleteConfirm({
  rule,
  onClose,
  onSuccess,
}: {
  rule: Rule;
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactElement {
  const [submitting, setSubmitting] = useState(false);
  async function del() {
    setSubmitting(true);
    const res = await apiFetchClient<{ ok: boolean; error?: string }>(`/api/rules/${rule.id}`, {
      method: 'DELETE',
    });
    setSubmitting(false);
    if (!res.data.ok) {
      toast.error(res.data.error ?? "Oʻchirib boʻlmadi");
      return;
    }
    toast.success("Qoida oʻchirildi");
    onSuccess();
  }
  return (
    <ModalContent
      icon={<Trash2 />}
      iconTone="rose"
      title="Qoidani oʻchirishni xohlaysizmi?"
      subtitle="Bu amalni orqaga qaytarib boʻlmaydi"
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="button" variant="destructive" onClick={del} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            <Trash2 />
            Oʻchirish
          </Button>
        </div>
      }
    >
      <div className="p-3 rounded-[10px] bg-[color:var(--background-2)]">
        <div className="text-[13px] font-semibold">{rule.title}</div>
        <p className="text-[11.5px] text-[color:var(--ink-3)] mt-1 line-clamp-2">{rule.content}</p>
      </div>
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

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? 'bg-primary' : 'bg-[color:var(--border-2)]'
      }`}
      aria-pressed={on}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          on ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
