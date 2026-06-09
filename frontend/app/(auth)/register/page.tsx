'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/phone-input';
import { PinPad } from '@/components/pin-pad';
import { PinDots } from '@/components/ui/pin-dots';
import { NPMark } from '@/components/brand/np-logo';
import { cn } from '@/lib/utils';

type StoreOption = { id: string; name: string; slug: string };

const STORE_META: Record<string, { emoji: string; type: string }> = {
  'amir-kids': { emoji: '🧸', type: 'Bolalar' },
  'amir-premium': { emoji: '💼', type: 'Premium' },
  'dubai-house': { emoji: '👔', type: 'Kiyim' },
  'dubai-house-abu-sahiy': { emoji: '👔', type: 'Kiyim · Abu Sahiy' },
  'dubai-house-afsona': { emoji: '👔', type: 'Kiyim · Afsona' },
  'dubai-gold': { emoji: '✨', type: 'Zargarlik' },
  'amir-avto-savdo': { emoji: '🚗', type: 'Avto savdo' },
  ofis: { emoji: '📎', type: 'Ofis' },
};

const STEPS = ['Ism', 'Telefon', "Do'kon", 'PIN'] as const;

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeId, setStoreId] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((d) => setStores(d.stores ?? []))
      .catch(() => toast.error("Do'konlar ro'yxatini olib bo'lmadi"));
  }, []);

  function next() {
    if (step === 0 && firstName.trim().length < 2) {
      toast.error('Ismni to‘g‘ri kiriting');
      return;
    }
    if (step === 1 && normalizePhone(phone).length < 9) {
      toast.error("Telefon raqamni to'g'ri kiriting");
      return;
    }
    if (step === 2 && !storeId) {
      toast.error("Do'kon tanlanmagan");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (pin.length < 4) {
      toast.error('PIN kamida 4 raqam');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: normalizePhone(phone),
          storeId,
          password: pin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Ro'yxatdan o'tib bo'lmadi");
        return;
      }
      toast.success("Ro'yxatdan o'tdingiz! Admin tasdiqlashini kuting.");
      router.push('/login');
    } catch {
      toast.error('Tarmoq xatosi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-[60px] border-b bg-card flex items-center px-6 lg:px-8 gap-4">
        <NPMark size={28} />
        <span className="font-semibold text-[16px] tracking-[-0.02em]">
          Nazoratchi <span className="text-primary">AI</span>
        </span>
        <div className="flex-1" />
        <span className="text-[12.5px] text-[color:var(--ink-3)] hidden sm:inline">
          Allaqachon ro&apos;yxatdan o&apos;tganmisiz?
        </span>
        <Link href="/login">
          <Button variant="secondary" size="sm">
            Kirish
          </Button>
        </Link>
      </header>

      <div className="flex-1 lg:grid lg:grid-cols-2">
        {/* Form pane */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-[460px] space-y-6">
            <Stepper currentStep={step} />

            {step === 0 && (
              <StepName
                firstName={firstName}
                lastName={lastName}
                onFirst={setFirstName}
                onLast={setLastName}
              />
            )}
            {step === 1 && <StepPhone phone={phone} onPhone={setPhone} />}
            {step === 2 && (
              <StepStore stores={stores} storeId={storeId} onSelect={setStoreId} />
            )}
            {step === 3 && <StepPin pin={pin} onChange={setPin} disabled={submitting} />}

            <div className="flex gap-2.5">
              <Button
                variant="secondary"
                size="lg"
                onClick={back}
                disabled={step === 0 || submitting}
                className="flex-1"
              >
                <ArrowLeft />
                Orqaga
              </Button>
              {step < 3 ? (
                <Button onClick={next} size="lg" className="flex-[2]">
                  Davom etish
                  <ArrowRight />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting} size="lg" className="flex-[2]">
                  {submitting && <Loader2 className="animate-spin" />}
                  Yakunlash
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Steps preview pane (desktop only) */}
        <aside className="hidden lg:block bg-[color:var(--background-2)] p-10 relative overflow-hidden">
          <SectionTitle>Qadamlar haqida</SectionTitle>
          <div className="space-y-2.5">
            {(
              [
                ['Ism', 'Sizni qanday chaqirishni bilamiz.'],
                ['Telefon', '+998 9X XXX XX XX — sessiya identifikatori.'],
                ["Do'kon", "Ishlash joyingiz — 8 ta do'kondan bittasi."],
                ['PIN', '4 raqamli kod. Faqat siz bilasiz.'],
              ] as const
            ).map(([title, sub], idx) => {
              const isActive = idx === step;
              const isDone = idx < step;
              return (
                <div
                  key={title}
                  className={cn(
                    'rounded-[14px] border bg-card p-3.5 transition-all',
                    isActive
                      ? 'border-primary shadow-[0_0_0_3px_var(--accent)]'
                      : 'border-[color:var(--border)] shadow-[var(--shadow-card)]',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-grid place-items-center size-9 rounded-[10px] shrink-0 text-[13px] font-semibold',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isDone
                            ? 'bg-[color:var(--emerald-soft)] text-[color:var(--emerald)]'
                            : 'bg-[color:var(--background-2)] text-[color:var(--ink-2)]',
                      )}
                    >
                      {isDone ? <Check className="size-4" /> : idx + 1}
                    </span>
                    <div className="flex-1 leading-tight">
                      <div className="text-[13px] font-semibold">
                        {idx + 1}. {title}
                      </div>
                      <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">{sub}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-[14px] border bg-card p-4">
            <div className="flex gap-2.5 items-start">
              <span className="inline-grid place-items-center size-7 rounded-lg bg-[color:var(--amber-soft)] text-[color:var(--amber-ink)] [&_svg]:size-3.5 shrink-0">
                <InfoIcon />
              </span>
              <div>
                <div className="text-[13px] font-semibold">Tasdiqlash kerak</div>
                <div className="text-[12px] text-[color:var(--ink-3)] mt-1 leading-[1.45]">
                  Ro&apos;yxatdan o&apos;tgandan keyin admin sizni 1–2 soat ichida tasdiqlaydi.
                  Tasdiqlangach Telegram orqali xabar olasiz.
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }): React.ReactElement {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between text-[11.5px] text-[color:var(--ink-3)] font-medium">
        <span>
          Qadam {currentStep + 1}/{STEPS.length}
        </span>
        <span>{STEPS[currentStep]}</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 rounded-full transition-colors',
              i <= currentStep ? 'bg-primary' : 'bg-[color:var(--border-2)]',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function StepName({
  firstName,
  lastName,
  onFirst,
  onLast,
}: {
  firstName: string;
  lastName: string;
  onFirst: (v: string) => void;
  onLast: (v: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">
          Avval, sizni qanday chaqirsak?
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[color:var(--ink-3)] leading-[1.5]">
          To&apos;liq ismingizni xuddi pasportdagidek kiriting. Hisobotlarda shu ko&apos;rinishda chiqadi.
        </p>
      </div>
      <div className="space-y-3">
        <Field label="Ism">
          <Input
            value={firstName}
            onChange={(e) => onFirst(e.target.value)}
            placeholder="Masalan: Suhrob"
            autoFocus
          />
        </Field>
        <Field label="Familiya">
          <Input
            value={lastName}
            onChange={(e) => onLast(e.target.value)}
            placeholder="Masalan: Karimov"
          />
        </Field>
      </div>
    </div>
  );
}

function StepPhone({
  phone,
  onPhone,
}: {
  phone: string;
  onPhone: (v: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Telefon raqamingiz</h1>
        <p className="mt-1.5 text-[13.5px] text-[color:var(--ink-3)] leading-[1.5]">
          Telefon — sizning shaxsingizni aniqlovchi asosiy ma&apos;lumot. Keyinchalik shu raqam
          bilan tizimga kirasiz.
        </p>
      </div>
      <Field label="Telefon">
        <PhoneInput value={phone} onChange={onPhone} autoFocus />
      </Field>
    </div>
  );
}

function StepStore({
  stores,
  storeId,
  onSelect,
}: {
  stores: StoreOption[];
  storeId: string;
  onSelect: (id: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Qaysi do&apos;konda ishlaysiz?</h1>
        <p className="mt-1.5 text-[13.5px] text-[color:var(--ink-3)]">
          Faqat bittasini tanlang. Admin tasdiqlaydi.
        </p>
      </div>
      {stores.length === 0 ? (
        <div className="text-[13px] text-[color:var(--ink-3)]">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {stores.map((s) => (
            <StoreTile
              key={s.id}
              store={s}
              meta={STORE_META[s.slug] ?? { emoji: '🏪', type: '' }}
              selected={storeId === s.id}
              onClick={() => onSelect(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StoreTile({
  store,
  meta,
  selected,
  onClick,
}: {
  store: StoreOption;
  meta: { emoji: string; type: string };
  selected: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative text-left rounded-[14px] border-[1.5px] p-3.5 transition-colors',
        selected
          ? 'border-primary bg-accent'
          : 'border-[color:var(--border)] bg-card hover:border-[color:var(--border-2)]',
      )}
    >
      <div
        className="size-9 rounded-[10px] grid place-items-center text-xl mb-2.5 bg-[color:var(--background-2)]"
      >
        {meta.emoji}
      </div>
      <div
        className={cn(
          'text-[13px] font-semibold',
          selected ? 'text-primary' : 'text-foreground',
        )}
      >
        {store.name}
      </div>
      {meta.type && (
        <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5">{meta.type}</div>
      )}
      {selected && (
        <span className="absolute top-2.5 right-2.5 size-[18px] rounded-full bg-primary text-primary-foreground grid place-items-center">
          <Check className="size-2.5" strokeWidth={2.6} />
        </span>
      )}
    </button>
  );
}

function StepPin({
  pin,
  onChange,
  disabled,
}: {
  pin: string;
  onChange: (v: string) => void;
  disabled: boolean;
}): React.ReactElement {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Maxfiy PIN tanlang</h1>
        <p className="mt-1.5 text-[13.5px] text-[color:var(--ink-3)] leading-[1.5]">
          4 raqam. Keyinchalik shu PIN bilan tizimga kirasiz.
        </p>
      </div>
      <PinDots filled={pin.length} total={4} />
      <PinPad value={pin} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h3 className="text-[13px] font-semibold text-[color:var(--ink-2)] tracking-[-0.01em] uppercase mb-2.5">
      {children}
    </h3>
  );
}

function InfoIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v.5M12 11v5" />
    </svg>
  );
}
