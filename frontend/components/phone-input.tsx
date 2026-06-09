'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string;
}

/** Har qanday formatdan faqat raqamlar olish, 998 prefix bilan (maks 12 raqam) */
function normalize(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('998') && d.length >= 3) return d.slice(0, 12);
  if (d.length <= 9) return '998' + d;
  return d.slice(0, 12);
}

/** 998XXXXXXXXX → +998 XX XXX XX XX */
function format(digits: string): string {
  if (!digits || digits.length < 3) return '+998 ';
  const local = digits.slice(3);
  let s = '+998';
  if (local.length > 0) s += ' ' + local.slice(0, 2);
  if (local.length > 2) s += ' ' + local.slice(2, 5);
  if (local.length > 5) s += ' ' + local.slice(5, 7);
  if (local.length > 7) s += ' ' + local.slice(7, 9);
  return s;
}

export function PhoneInput({
  value = '',
  onChange,
  className,
  id,
  disabled,
  autoFocus,
  error,
}: PhoneInputProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);

  const [raw, setRaw] = useState<string>(() => {
    const d = value.replace(/\D/g, '');
    if (d.startsWith('998')) return d.slice(0, 12);
    if (d.length === 0) return '998';
    if (d.length <= 9) return '998' + d;
    return d.slice(0, 12);
  });

  // Tashqi `value` o'zgarsa, ichki holatni moslang
  useEffect(() => {
    if (!value) {
      setRaw('998');
      return;
    }
    const d = value.replace(/\D/g, '');
    const n = d.startsWith('998') ? d.slice(0, 12) : '998' + d.slice(0, 9);
    setRaw(n);
  }, [value]);

  const display = format(raw);

  const emit = useCallback(
    (digits: string) => {
      setRaw(digits);
      // Tashqi olamga `+998...` ko'rinishida beramiz (API normalizePhone() bilan tozalaydi)
      onChange?.(digits.length > 3 ? `+${digits}` : '');
    },
    [onChange],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const allDigits = input.replace(/\D/g, '');
      if (!allDigits.startsWith('998')) {
        const local = allDigits.slice(0, 9);
        emit('998' + local);
        return;
      }
      emit(allDigits.slice(0, 12));
    },
    [emit],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = ref.current;
    if (!el) return;
    const cursor = el.selectionStart ?? 0;
    // "+998 " prefiksini o'chirishga yo'l qo'ymaymiz
    if (e.key === 'Backspace' && cursor <= 5 && el.selectionStart === el.selectionEnd) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Delete' && cursor < 5 && el.selectionStart === el.selectionEnd) {
      e.preventDefault();
      return;
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const digits = normalize(pasted);
      emit(digits);
      requestAnimationFrame(() => {
        const pos = format(digits).length;
        ref.current?.setSelectionRange(pos, pos);
      });
    },
    [emit],
  );

  const handleFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const pos = el.value.length;
      el.setSelectionRange(pos, pos);
    });
  }, []);

  return (
    <div className="relative">
      <Phone
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[color:var(--ink-3)]"
        aria-hidden
      />
      <input
        ref={ref}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        disabled={disabled}
        autoFocus={autoFocus}
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={handleFocus}
        aria-invalid={!!error || undefined}
        className={cn(
          'flex h-10 w-full rounded-[10px] border bg-card pl-10 pr-3.5 text-[13.5px] text-foreground tabular transition-colors',
          'placeholder:text-[color:var(--ink-3)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-[color:var(--rose)]'
            : 'border-[color:var(--border-2)]',
          className,
        )}
      />
    </div>
  );
}
