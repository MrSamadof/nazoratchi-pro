'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Lightbulb, Loader2, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/ui/status-pill';
import { formatDate } from '@/lib/format';
import {
  useListMySuggestionsQuery,
  useListSuggestionsQuery,
  useDecideSuggestionMutation,
  type ApiSuggestion,
} from '@/services/suggestionsApi';
import { SuggestionForm } from './suggestion-form';
import { SUGGESTION_STATUS_META, DIVISION_LABELS, type Role, type SuggestionStatus } from '@/shared/types';

export function SuggestionsView({ role }: { role: Role }): React.ReactElement {
  const isCeo = role === 'ceo';

  return (
    <div className={isCeo ? 'grid lg:grid-cols-[1fr_1fr] gap-5 items-start' : ''}>
      <MySuggestions />
      {isCeo && <CeoInbox />}
    </div>
  );
}

function MySuggestions(): React.ReactElement {
  const { data: suggestions = [], isLoading } = useListMySuggestionsQuery();

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-semibold">Mening takliflarim</span>
        <Badge tone="neutral">{suggestions.length} ta</Badge>
      </div>

      <div className="mb-4">
        <SuggestionForm />
      </div>

      {isLoading ? (
        <Loader2 className="size-5 mx-auto my-8 animate-spin text-[color:var(--ink-3)]" />
      ) : suggestions.length === 0 ? (
        <Empty text="Hali taklif yo'q — birinchi g'oyangizni yozing" />
      ) : (
        <div className="space-y-2.5">
          {suggestions.map((s) => (
            <MySuggestionRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </Card>
  );
}

function MySuggestionRow({ suggestion: s }: { suggestion: ApiSuggestion }): React.ReactElement {
  const meta = SUGGESTION_STATUS_META[s.status];
  return (
    <div className="p-3.5 rounded-[12px] bg-[color:var(--background-2)]">
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div className="min-w-0">
          {s.title && <div className="text-[13px] font-semibold">{s.title}</div>}
          <div className="text-[10.5px] text-[color:var(--ink-3)] tabular">{formatDate(s.createdAt)}</div>
        </div>
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      </div>
      <p className="mt-2 text-[12.5px] text-[color:var(--ink-2)] leading-[1.5] whitespace-pre-wrap">
        {s.text}
      </p>
      {s.isAnonymous && (
        <p className="mt-1.5 text-[11px] text-[color:var(--ink-3)]">Anonim yuborilgan</p>
      )}
      {s.ceoResponse && (
        <div className="mt-2 px-3 py-2 rounded-[8px] bg-card border text-[11.5px] text-[color:var(--ink-2)]">
          <span className="text-[color:var(--ink-3)] font-medium">CEO javobi: </span>
          {s.ceoResponse}
        </div>
      )}
    </div>
  );
}

const FILTERS: Array<{ value: SuggestionStatus | 'all'; label: string }> = [
  { value: 'new', label: 'Yangi' },
  { value: 'reviewing', label: "Ko'rilmoqda" },
  { value: 'accepted', label: 'Qabul' },
  { value: 'rejected', label: 'Rad' },
  { value: 'all', label: 'Hammasi' },
];

export function CeoInbox(): React.ReactElement {
  const [filter, setFilter] = useState<SuggestionStatus | 'all'>('new');
  const { data: suggestions = [], isLoading } = useListSuggestionsQuery(
    filter === 'all' ? undefined : { status: filter },
  );

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-semibold">Xodimlar takliflari</span>
        <Badge tone="amber">{suggestions.length} ta</Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-2.5 py-1 rounded-[8px] text-[12px] font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-[color:var(--background-2)] text-[color:var(--ink-2)] hover:bg-[color:var(--background-3,var(--background-2))]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loader2 className="size-5 mx-auto my-8 animate-spin text-[color:var(--ink-3)]" />
      ) : suggestions.length === 0 ? (
        <Empty text="Bu bo'limda taklif yo'q" />
      ) : (
        <div className="space-y-2.5">
          {suggestions.map((s) => (
            <CeoSuggestionRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </Card>
  );
}

function CeoSuggestionRow({ suggestion: s }: { suggestion: ApiSuggestion }): React.ReactElement {
  const [decide, { isLoading }] = useDecideSuggestionMutation();
  const [response, setResponse] = useState(s.ceoResponse ?? '');
  const meta = SUGGESTION_STATUS_META[s.status];

  async function act(status: SuggestionStatus) {
    try {
      await decide({ id: s.id, status, response: response.trim() || undefined }).unwrap();
      toast.success('Holat yangilandi');
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Xatolik');
    }
  }

  const author = s.isAnonymous
    ? 'Anonim'
    : [s.authorName, s.division ? DIVISION_LABELS[s.division] : null, s.storeName]
        .filter(Boolean)
        .join(' · ');

  return (
    <div className="p-3.5 rounded-[12px] bg-[color:var(--background-2)]">
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div className="min-w-0">
          {s.title && <div className="text-[13px] font-semibold">{s.title}</div>}
          <div className="flex items-center gap-1 text-[11px] text-[color:var(--ink-3)]">
            <UserRound className="size-3" />
            {author || '—'}
          </div>
        </div>
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      </div>

      <p className="mt-2 text-[12.5px] text-[color:var(--ink-2)] leading-[1.5] whitespace-pre-wrap">
        {s.text}
      </p>

      <div className="mt-2.5 space-y-2">
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Javob yoki izoh (ixtiyoriy)"
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act('accepted')} disabled={isLoading}>
            Qabul qilish
          </Button>
          <Button size="sm" variant="outline" onClick={() => act('reviewing')} disabled={isLoading}>
            Ko&apos;rib chiqilmoqda
          </Button>
          <Button size="sm" variant="outline" onClick={() => act('rejected')} disabled={isLoading}>
            Rad etish
          </Button>
        </div>
        <p className="text-[10.5px] text-[color:var(--ink-3)] tabular">{formatDate(s.createdAt)}</p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }): React.ReactElement {
  return (
    <div className="text-center py-10 text-[color:var(--ink-3)]">
      <Lightbulb className="size-7 mx-auto opacity-50 mb-2" />
      <p className="text-[13px]">{text}</p>
    </div>
  );
}
