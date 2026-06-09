'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { LogOut, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NPMark } from '@/components/brand/np-logo';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface MobileMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Ixtiyoriy rozetka soni (masalan, ko'rilmagan takliflar). */
  badge?: number;
}

interface Props {
  items: MobileMenuItem[];
  fullName: string;
  roleLabel: string;
  /** Exact-match root href (e.g. '/dashboard' or '/ceo'). */
  homeHref: string;
}

/**
 * Mobil (lg dan kichik) navigatsiya: burger tugma + chapdan ochiladigan menyu.
 * Pastki tab-bar o'rniga — barcha rollar uchun.
 */
export function MobileMenuDrawer({
  items,
  fullName,
  roleLabel,
  homeHref,
}: Props): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="lg:hidden inline-grid place-items-center size-9 rounded-[10px] text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        aria-label="Menyu"
      >
        <Menu className="size-5" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="nz-overlay lg:hidden fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'nz-drawer lg:hidden fixed inset-y-0 left-0 z-50 flex w-[min(82vw,300px)] flex-col bg-card border-r border-[color:var(--border)]',
            'shadow-[0_0_40px_-4px_rgba(20,20,30,0.25)]',
          )}
        >
          <Dialog.Title className="sr-only">Navigatsiya menyusi</Dialog.Title>

          <div className="flex items-center justify-between px-4 h-14 border-b border-[color:var(--border-2)]">
            <Link
              href={homeHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5"
            >
              <NPMark size={26} />
              <div className="leading-tight">
                <div className="text-[13.5px] font-semibold">
                  Nazoratchi <span className="text-[color:var(--ink-3)]">AI</span>
                </div>
                <div className="text-[10px] text-[color:var(--ink-3)] uppercase tracking-[0.06em]">
                  {roleLabel}
                </div>
              </div>
            </Link>
            <Dialog.Close
              className="size-8 grid place-items-center rounded-[8px] text-[color:var(--ink-3)] hover:bg-[color:var(--background-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Yopish"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
            {items.map((item) => {
              const isActive =
                item.href === homeHref
                  ? pathname === homeHref
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[14px] font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)]',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="size-[17px]" />
                  {item.label}
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={cn(
                        'ml-auto min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10.5px] font-semibold tabular',
                        isActive
                          ? 'bg-white/25 text-primary-foreground'
                          : 'bg-[color:var(--rose)] text-white',
                      )}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[color:var(--border-2)] p-3">
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
              <Avatar name={fullName} size={34} />
              <div className="leading-tight min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold truncate">{fullName}</div>
                <div className="text-[11px] text-[color:var(--ink-3)] truncate">{roleLabel}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-[9px] text-[14px] font-medium text-[color:var(--rose)] hover:bg-[color:var(--rose-soft)] transition-colors disabled:opacity-60"
            >
              <LogOut className="size-[17px]" />
              Chiqish
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
