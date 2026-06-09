'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Lightbulb, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import { useCreateSuggestionMutation } from '@/services/suggestionsApi';

export function SuggestionForm(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [createSuggestion, { isLoading }] = useCreateSuggestionMutation();

  function reset() {
    setTitle('');
    setText('');
    setIsAnonymous(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 10) {
      toast.error('Taklif kamida 10 belgi bo\'lsin');
      return;
    }
    try {
      await createSuggestion({
        title: title.trim() || undefined,
        text: text.trim(),
        isAnonymous,
      }).unwrap();
      toast.success('Taklif yuborildi');
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
          Taklif berish
        </Button>
      </ModalTrigger>
      <ModalContent
        icon={<Lightbulb />}
        iconTone="emerald"
        title="Taklif berish"
        subtitle="Ish unumini oshiradigan g'oyangizni yozing — to'g'ridan-to'g'ri CEO ga boradi"
        width={480}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" form="suggestion-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Lightbulb />}
              Yuborish
            </Button>
          </div>
        }
      >
        <form id="suggestion-form" onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label
                htmlFor="suggestion-title"
                className="text-[12.5px] font-medium text-[color:var(--ink-2)]"
              >
                Sarlavha
              </Label>
              <span className="text-[11px] text-[color:var(--ink-3)]">ixtiyoriy</span>
            </div>
            <Input
              id="suggestion-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Qisqacha — masalan: Kassada navbatni kamaytirish"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="suggestion-text"
              className="text-[12.5px] font-medium text-[color:var(--ink-2)]"
            >
              Taklif
            </Label>
            <Textarea
              id="suggestion-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Muammo nimada va qanday yaxshilash mumkin?"
              rows={5}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="size-4 rounded-[5px] border border-[color:var(--border-2)] accent-[color:var(--primary)] cursor-pointer"
            />
            <span className="text-[12.5px] text-[color:var(--ink-2)]">
              Anonim yuborish — ismingiz CEO ga ko&apos;rinmaydi
            </span>
          </label>
        </form>
      </ModalContent>
    </Modal>
  );
}
