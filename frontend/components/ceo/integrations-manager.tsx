'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bolt, Check, Database, Loader2, PlugZap, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetchClient } from '@/lib/api-client';

export interface IntegrationsState {
  geminiConfigured: boolean;
  geminiApiKeyMasked: string | null;
  geminiModel: string;
  telegramConfigured: boolean;
  telegramBotTokenMasked: string | null;
  telegramBotUsername: string | null;
  billzConfigured: boolean;
  billzSecretTokenMasked: string | null;
}

interface PutResp {
  ok: boolean;
  error?: string;
  integrations?: IntegrationsState;
}

export function IntegrationsManager({
  initial,
}: {
  initial: IntegrationsState;
}): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState(initial);

  async function save(
    body: Record<string, string>,
    okMsg: string,
  ): Promise<boolean> {
    const res = await apiFetchClient<PutResp>('/api/ceo/integrations', {
      method: 'PUT',
      body,
    });
    if (!res.data.ok || !res.data.integrations) {
      toast.error(res.data.error ?? 'Saqlanmadi');
      return false;
    }
    setState(res.data.integrations);
    toast.success(okMsg);
    router.refresh();
    return true;
  }

  return (
    <>
      {/* Billz POS */}
      <IntegrationCard
        id="billz"
        icon={<Database className="size-4" />}
        tone="accent"
        title="Billz POS"
        subtitle="Do'kon savdolari shu integratsiya orqali tortiladi"
        configured={state.billzConfigured}
      >
        <SecretForm
          label="Secret token (integratsiya kaliti)"
          hint="BILLZ → Sozlamalar → Ключи интеграции'dan olingan kalit. Bo'sh qoldirsangiz — o'zgarmaydi."
          placeholder={state.billzSecretTokenMasked ?? 'db534e...'}
          configured={state.billzConfigured}
          onSave={(value) => save({ billzSecretToken: value }, 'Billz kaliti saqlandi')}
          onClear={() => save({ billzSecretToken: '' }, "Billz kaliti o'chirildi")}
        />
        {state.billzConfigured && <BillzActions />}
      </IntegrationCard>

      {/* Telegram */}
      <IntegrationCard
        id="telegram"
        icon={<Send className="size-4" />}
        tone="accent"
        title="Telegram bot"
        subtitle="Bildirishnoma va hisobotlar shu bot orqali yuboriladi"
        configured={state.telegramConfigured}
        statusExtra={
          state.telegramBotUsername ? `@${state.telegramBotUsername}` : undefined
        }
      >
        <SecretForm
          label="Bot token"
          hint="@BotFather'dan olingan token. Bo'sh qoldirsangiz — o'zgarmaydi."
          placeholder={state.telegramBotTokenMasked ?? '123456:ABC-DEF...'}
          configured={state.telegramConfigured}
          onSave={(value) => save({ telegramBotToken: value }, 'Telegram tokeni saqlandi')}
          onClear={() => save({ telegramBotToken: '' }, "Telegram tokeni o'chirildi")}
        />
      </IntegrationCard>

      {/* Gemini AI */}
      <IntegrationCard
        id="ai"
        icon={<Bolt className="size-4" />}
        tone="emerald"
        title="Gemini AI"
        subtitle="Kunlik/haftalik hisobotlar AI tahlili uchun"
        configured={state.geminiConfigured}
        statusExtra={state.geminiModel}
      >
        <SecretForm
          label="API kalit"
          hint="Google AI Studio'dan olingan kalit. Bo'sh qoldirsangiz — o'zgarmaydi."
          placeholder={state.geminiApiKeyMasked ?? 'AIza...'}
          configured={state.geminiConfigured}
          onSave={(value) => save({ geminiApiKey: value }, 'Gemini kaliti saqlandi')}
          onClear={() => save({ geminiApiKey: '' }, "Gemini kaliti o'chirildi")}
        />
        <ModelForm
          initialModel={state.geminiModel}
          onSave={(model) => save({ geminiModel: model }, 'Model saqlandi')}
        />
      </IntegrationCard>
    </>
  );
}

function IntegrationCard({
  id,
  icon,
  tone,
  title,
  subtitle,
  configured,
  statusExtra,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  tone: 'accent' | 'emerald';
  title: string;
  subtitle: string;
  configured: boolean;
  statusExtra?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const bg = tone === 'accent' ? 'var(--accent)' : 'var(--emerald-soft)';
  const fg = tone === 'accent' ? 'var(--primary)' : 'var(--emerald)';
  return (
    <div
      id={id}
      className="rounded-[16px] border border-[color:var(--border)] bg-card p-6 scroll-mt-6"
    >
      <div className="flex items-center gap-3">
        <span
          className="size-9 grid place-items-center rounded-[10px] shrink-0"
          style={{ background: bg, color: fg }}
        >
          {icon}
        </span>
        <div className="leading-tight flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold">{title}</span>
            {configured ? (
              <Badge tone="emerald" dot>
                Yoqilgan
              </Badge>
            ) : (
              <Badge tone="neutral">Sozlanmagan</Badge>
            )}
            {configured && statusExtra && (
              <span className="text-[11.5px] text-[color:var(--ink-3)] tabular">{statusExtra}</span>
            )}
          </div>
          <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">{subtitle}</div>
        </div>
      </div>
      <div className="mt-5 space-y-3.5">{children}</div>
    </div>
  );
}

function SecretForm({
  label,
  hint,
  placeholder,
  configured,
  onSave,
  onClear,
}: {
  label: string;
  hint: string;
  placeholder: string;
  configured: boolean;
  onSave: (value: string) => Promise<boolean>;
  onClear: () => Promise<boolean>;
}): React.ReactElement {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleSave() {
    if (value.trim().length < 4) {
      toast.error('Kalit juda qisqa');
      return;
    }
    setSaving(true);
    const ok = await onSave(value.trim());
    setSaving(false);
    if (ok) setValue('');
  }

  async function handleClear() {
    setClearing(true);
    await onClear();
    setClearing(false);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</Label>
        {configured && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--emerald)]">
            <Check className="size-3" />
            saqlangan
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="font-mono flex-1"
          autoComplete="off"
        />
        <Button type="button" onClick={handleSave} disabled={saving || !value.trim()}>
          {saving && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
        {configured && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={clearing}
            title="O'chirish"
          >
            {clearing ? <Loader2 className="animate-spin" /> : <Trash2 className="text-[color:var(--rose)]" />}
          </Button>
        )}
      </div>
      <div className="text-[11.5px] text-[color:var(--ink-3)]">{hint}</div>
    </div>
  );
}

function ModelForm({
  initialModel,
  onSave,
}: {
  initialModel: string;
  onSave: (model: string) => Promise<boolean>;
}): React.ReactElement {
  const [model, setModel] = useState(initialModel);
  const [saving, setSaving] = useState(false);
  const dirty = model.trim() !== initialModel && model.trim().length > 0;

  async function handleSave() {
    setSaving(true);
    await onSave(model.trim());
    setSaving(false);
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">Model</Label>
      <div className="flex gap-2">
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gemini-2.5-flash"
          className="font-mono flex-1"
        />
        <Button type="button" variant="outline" onClick={handleSave} disabled={saving || !dirty}>
          {saving && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
      </div>
    </div>
  );
}

interface BillzTestResp {
  ok: boolean;
  error?: string;
  company?: { id: string; name: string };
  shopCount?: number;
  shops?: Array<{ id: string; name: string }>;
}

interface BillzSyncResp {
  ok: boolean;
  error?: string;
  synced?: number;
  failed?: number;
}

function BillzActions(): React.ReactElement {
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; name: string }> | null>(null);

  async function handleTest() {
    setTesting(true);
    const res = await apiFetchClient<BillzTestResp>('/api/ceo/billz/test');
    setTesting(false);
    if (!res.data.ok) {
      toast.error(res.data.error ?? 'Ulanmadi');
      setShops(null);
      return;
    }
    setShops(res.data.shops ?? []);
    toast.success(
      `Ulanish OK · ${res.data.company?.name ?? ''} · ${res.data.shopCount ?? 0} ta do'kon`,
    );
  }

  async function handleSync() {
    setSyncing(true);
    const res = await apiFetchClient<BillzSyncResp>('/api/ceo/billz/sync', { method: 'POST' });
    setSyncing(false);
    if (!res.data.ok) {
      toast.error(res.data.error ?? 'Sinx xatosi');
      return;
    }
    toast.success(`Sinx tugadi · ${res.data.synced ?? 0} ta · xato: ${res.data.failed ?? 0}`);
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="animate-spin" /> : <PlugZap className="size-4" />}
          Ulanishni tekshirish
        </Button>
        <Button type="button" variant="outline" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw className="size-4" />}
          Hozir sinx qilish
        </Button>
      </div>

      {shops && (
        <div className="rounded-[12px] border border-[color:var(--border)] bg-[color:var(--background-2)] p-3">
          <div className="text-[11.5px] font-medium text-[color:var(--ink-2)] mb-2">
            Billz do'konlari ({shops.length}) — do'konni bog'lash uchun UUID'ni nusxalang:
          </div>
          {shops.length === 0 ? (
            <div className="text-[11.5px] text-[color:var(--ink-3)]">Do'kon topilmadi.</div>
          ) : (
            <ul className="space-y-1.5">
              {shops.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="font-medium truncate">{s.name}</span>
                  <code className="font-mono text-[10.5px] text-[color:var(--ink-3)] shrink-0">
                    {s.id}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
