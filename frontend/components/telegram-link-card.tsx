'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Link2Off, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useGetTelegramStatusQuery,
  useCreateTelegramLinkMutation,
  useUnlinkTelegramMutation,
} from '@/services/telegramApi';

export function TelegramLinkCard(): React.ReactElement {
  const [waiting, setWaiting] = useState(false);
  const [manualToken, setManualToken] = useState<string | null>(null);
  const wasLinked = useRef(false);

  // Bog'lashni kutayotganda holatni har 3 soniyada tekshiramiz.
  const { data: status, isLoading } = useGetTelegramStatusQuery(undefined, {
    pollingInterval: waiting ? 3000 : 0,
  });
  const [createLink, { isLoading: creating }] = useCreateTelegramLinkMutation();
  const [unlink, { isLoading: unlinking }] = useUnlinkTelegramMutation();

  const linked = status?.linked ?? false;
  const botEnabled = status?.botEnabled ?? true;

  // Kutish davomida bog'lanish sodir bo'lsa — muvaffaqiyat.
  useEffect(() => {
    if (waiting && linked && !wasLinked.current) {
      setWaiting(false);
      setManualToken(null);
      toast.success('Telegram akkauntingiz bog\'landi!');
    }
    wasLinked.current = linked;
  }, [waiting, linked]);

  async function handleConnect() {
    try {
      const res = await createLink().unwrap();
      if (!res.ok) {
        toast.error(res.error ?? 'Havola yaratilmadi');
        return;
      }
      setWaiting(true);
      if (res.deepLink) {
        window.open(res.deepLink, '_blank', 'noopener');
        toast.info('Telegram ochildi — botda "Start" tugmasini bosing');
      } else {
        // Username aniqlanmadi — qo'lda /start <token> yuborish kerak.
        setManualToken(res.token);
      }
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'data' in err
          ? ((err as { data?: { error?: string } }).data?.error ?? null)
          : null;
      toast.error(msg ?? 'Texnik xato');
    }
  }

  async function handleUnlink() {
    try {
      await unlink().unwrap();
      setWaiting(false);
      toast.success('Telegram uzildi');
    } catch {
      toast.error('Uzishda xato');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            Telegram
          </CardTitle>
          {!isLoading &&
            (linked ? (
              <Badge tone="emerald" dot>
                Ulangan
              </Badge>
            ) : (
              <Badge tone="neutral">Ulanmagan</Badge>
            ))}
        </div>
        <CardDescription>
          Hisobotlar, eslatmalar va bildirishnomalarni Telegram orqali olish uchun akkauntingizni
          ulang.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-[color:var(--ink-3)]">
            <Loader2 className="size-4 animate-spin" />
            Yuklanmoqda…
          </div>
        ) : !botEnabled ? (
          <p className="text-[13px] text-[color:var(--ink-3)]">
            Telegram bot hozircha sozlanmagan. Administrator bilan bog&apos;laning.
          </p>
        ) : linked ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-[color:var(--ink-2)]">
              {status?.telegramUsername
                ? `@${status.telegramUsername} ulangan.`
                : 'Telegram akkaunt ulangan.'}
            </p>
            <Button variant="softrose" size="sm" onClick={handleUnlink} disabled={unlinking}>
              {unlinking ? <Loader2 className="animate-spin" /> : <Link2Off />}
              Uzish
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={handleConnect} disabled={creating || waiting}>
              {creating || waiting ? <Loader2 className="animate-spin" /> : <ExternalLink />}
              {waiting ? 'Telegram ochildi — kutilmoqda…' : 'Telegram\'ni ulash'}
            </Button>

            {waiting && (
              <p className="text-[12px] text-[color:var(--ink-3)]">
                Botda <b>Start</b> tugmasini bosing. Ulangach bu yer avtomatik yangilanadi.
              </p>
            )}

            {manualToken && (
              <ManualTokenHint token={manualToken} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Bot username aniqlanmaganda — foydalanuvchi botga qo'lda yuboradigan buyruq. */
function ManualTokenHint({ token }: { token: string }): React.ReactElement {
  const command = `/start ${token}`;
  return (
    <div className="rounded-[10px] border border-[color:var(--border-2)] bg-[color:var(--background-2)] p-3 space-y-2">
      <p className="text-[12px] text-[color:var(--ink-2)]">
        Botni topib, quyidagi buyruqni yuboring:
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[12.5px] font-mono break-all">{command}</code>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            void navigator.clipboard.writeText(command);
            toast.success('Nusxalandi');
          }}
        >
          <Copy />
        </Button>
      </div>
    </div>
  );
}
