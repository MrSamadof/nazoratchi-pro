'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/phone-input';
import { PinPad } from '@/components/pin-pad';
import { PinDots } from '@/components/ui/pin-dots';
import { NPMark, NPLogo } from '@/components/brand/np-logo';

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export default function LoginPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';

  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1-bosqich: telefon raqami kiritiladi, so'ng PIN ekraniga o'tiladi.
  function goToPin(e?: React.FormEvent) {
    e?.preventDefault();
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 12) {
      toast.error("Telefon raqamni to'liq kiriting");
      return;
    }
    setStep('pin');
  }

  function backToPhone() {
    setStep('phone');
    setPin('');
  }

  async function handleSubmit() {
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 9) {
      toast.error("Telefon raqamni to'g'ri kiriting");
      return;
    }
    if (pin.length < 4) {
      toast.error('PIN kamida 4 raqam');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password: pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Kirish bo'lmadi");
        setPin('');
        return;
      }
      toast.success(`Xush kelibsiz, ${data.user.firstName}!`);
      // Rol bo'yicha yo'naltirish (CEO → /ceo, qolganlar → /dashboard yoki ?next)
      const target =
        next && next !== '/' && next !== '/dashboard'
          ? next
          : data.user.role === 'ceo'
            ? '/ceo'
            : '/dashboard';
      router.push(target);
      router.refresh();
    } catch {
      toast.error('Tarmoq xatosi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand pane — only on lg+ */}
      <aside className="hidden lg:flex relative overflow-hidden text-white p-12 flex-col justify-between bg-[linear-gradient(165deg,oklch(0.32_0.13_268)_0%,oklch(0.22_0.08_270)_100%)]">
        <svg
          className="absolute -right-16 -top-16 opacity-15"
          width="360"
          height="360"
          viewBox="0 0 360 360"
          fill="none"
          aria-hidden
        >
          <circle cx="180" cy="180" r="170" fill="none" stroke="#fff" strokeWidth="1" />
          <circle cx="180" cy="180" r="120" fill="none" stroke="#fff" strokeWidth="1" />
          <circle cx="180" cy="180" r="70" fill="none" stroke="#fff" strokeWidth="1" />
          <circle cx="180" cy="180" r="24" fill="#fff" opacity=".5" />
        </svg>

        <div className="flex items-center gap-2.5 relative">
          <NPMark size={36} accent="#fff" />
          <span className="font-semibold text-[19px] tracking-[-0.02em]">
            Nazoratchi <span className="opacity-70">AI</span>
          </span>
        </div>

        <div className="max-w-[460px] relative space-y-5">
          <h1 className="text-[38px] font-semibold tracking-[-0.03em] leading-[1.1]">
            Xodimlar davomati va savdo nazorati — bitta joyda.
          </h1>
          <p className="text-[14.5px] leading-[1.55] opacity-80">
            Amir kompaniyasining 8 ta do&apos;koni uchun yagona ish o&apos;rni: kelish/ketish, kunlik
            savdo, ruxsat so&apos;rovlari va Gemini AI tahlili.
          </p>
          <div className="flex gap-6 mt-4 opacity-90">
            <Stat value="8" label="do'kon" />
            <Stat value="84" label="xodim" />
            <Stat value="21:00" label="kunlik hisobot" />
          </div>
        </div>

        <div className="flex gap-3 opacity-65 text-[12px] relative">
          <span>© 2026 Amir Co.</span>
          <span>·</span>
          <span>Toshkent, O&apos;zbekiston</span>
        </div>
      </aside>

      {/* Form pane */}
      <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[380px] space-y-6">
          {/* Mobile logo (visible only when brand pane is hidden) */}
          <div className="lg:hidden flex items-center justify-between">
            <NPLogo size={28} />
          </div>

          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.025em]">Tizimga kirish</h2>
            <p className="mt-1.5 text-[13.5px] text-[color:var(--ink-3)]">
              Yangi xodimmisiz?{' '}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Ro&apos;yxatdan o&apos;ting
              </Link>
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={goToPin} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
                  Telefon raqami
                </label>
                <PhoneInput id="phone" value={phone} onChange={setPhone} autoFocus />
              </div>
              <Button type="submit" className="w-full" size="xl">
                Davom etish
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <button
                type="button"
                onClick={backToPhone}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] hover:text-foreground transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
                {phone} · o&apos;zgartirish
              </button>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[color:var(--ink-2)]">PIN kod</span>
                  <span className="text-[11px] text-[color:var(--ink-3)]">4 raqam</span>
                </div>
                <PinDots filled={pin.length} total={4} />
                <PinPad value={pin} onChange={setPin} disabled={submitting} />
              </div>

              <Button
                className="w-full"
                size="xl"
                onClick={handleSubmit}
                disabled={submitting || pin.length < 4}
              >
                {submitting && <Loader2 className="animate-spin" />}
                Kirish
              </Button>

              <p className="text-center text-[11.5px] text-[color:var(--ink-3)]">
                PIN ni unutdingizmi?{' '}
                <span className="text-primary font-medium">Menejerga murojaat qiling</span>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[22px] font-semibold tabular">{value}</span>
      <span className="text-[12px] opacity-70">{label}</span>
    </div>
  );
}
