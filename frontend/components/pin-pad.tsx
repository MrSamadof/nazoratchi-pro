'use client';

import { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinPadProps {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinPad({
  value,
  onChange,
  maxLength = 4,
  disabled = false,
  className,
}: PinPadProps): React.ReactElement {
  const push = (digit: string) => {
    if (disabled) return;
    if (value.length >= maxLength) return;
    onChange(value + digit);
  };

  const back = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (disabled) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        push(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        back();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2.5 mx-auto select-none',
        'w-full max-w-[300px]',
        className,
      )}
    >
      {KEYS.map((k) => (
        <PinKey key={k} disabled={disabled} onClick={() => push(k)}>
          {k}
        </PinKey>
      ))}
      <div />
      <PinKey disabled={disabled} onClick={() => push('0')}>
        0
      </PinKey>
      <PinKey
        disabled={disabled || value.length === 0}
        onClick={back}
        ghost
        aria-label="O'chirish"
      >
        <Delete className="size-5" />
      </PinKey>
    </div>
  );
}

function PinKey({
  children,
  onClick,
  disabled,
  ghost = false,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ghost?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-[60px] rounded-[14px] font-medium text-[22px] text-foreground transition-colors',
        'active:scale-[0.97] active:bg-[color:var(--background-2)]',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        ghost
          ? 'bg-transparent hover:bg-[color:var(--background-2)]'
          : 'bg-card border border-[color:var(--border-2)] hover:bg-[color:var(--background-2)]',
      )}
      {...rest}
    >
      <span className="inline-flex items-center justify-center">{children}</span>
    </button>
  );
}
