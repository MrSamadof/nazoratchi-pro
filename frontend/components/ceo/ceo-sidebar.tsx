'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bolt,
  ChevronsUpDown,
  Cog,
  Home,
  Lightbulb,
  LogOut,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { NPMark } from '@/components/brand/np-logo';
import { Avatar } from '@/components/ui/avatar';
import { useGetNewSuggestionCountQuery } from '@/services/suggestionsApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/ceo', label: 'Bosh sahifa', icon: Home },
  { href: '/ceo/stores', label: "Do'konlar", icon: Store },
  { href: '/ceo/finance', label: 'Moliyaviy', icon: Wallet },
  { href: '/ceo/ai-analysis', label: 'AI tahlil', icon: Bolt },
  { href: '/ceo/team', label: 'Jamoa', icon: Users },
  { href: '/ceo/suggestions', label: 'Takliflar', icon: Lightbulb },
  { href: '/ceo/settings', label: 'Sozlamalar', icon: Cog },
];

export function CeoSidebar({
  fullName,
  role,
}: {
  fullName: string;
  role: string;
}): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const roleLabel = role === 'ceo' ? 'CEO · Boshliq' : role;
  // Ko'rilmagan (new) takliflar soni — 30 soniyada bir yangilanadi.
  const { data: newSuggestions = 0 } = useGetNewSuggestionCountQuery(undefined, {
    pollingInterval: 30_000,
  });

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
    <aside
      className="hidden lg:flex flex-col w-[232px] shrink-0 text-white p-4 gap-1 sticky top-0 h-screen overflow-hidden"
      style={{ background: 'oklch(0.18 0.012 268)' }}
    >
      <Link href="/ceo" className="flex items-center gap-2.5 px-2 pb-4 pt-2">
        <NPMark size={28} accent="#fff" />
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">
            Nazoratchi <span className="opacity-60">AI</span>
          </div>
          <div className="text-[10.5px] opacity-55 uppercase tracking-[0.06em]">Executive</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const isActive =
            item.href === '/ceo' ? pathname === '/ceo' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-white/65 hover:text-white hover:bg-white/5',
              )}
            >
              <Icon className="size-[15px]" />
              {item.label}
              {item.href === '/ceo/suggestions' && newSuggestions > 0 && (
                <span
                  className={cn(
                    'ml-auto min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10.5px] font-semibold tabular',
                    isActive ? 'bg-white/25 text-white' : 'bg-[color:var(--rose)] text-white',
                  )}
                >
                  {newSuggestions > 9 ? '9+' : newSuggestions}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center gap-2.5 p-2 rounded-[10px] w-full text-left',
            'bg-white/5 hover:bg-white/10 text-white',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors',
          )}
        >
          <Avatar name={fullName} size={32} />
          <div className="leading-tight min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">{fullName}</div>
            <div className="text-[10.5px] opacity-55 uppercase tracking-[0.04em] truncate">
              {roleLabel}
            </div>
          </div>
          <ChevronsUpDown className="size-[14px] opacity-55 shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[216px]">
          <DropdownMenuLabel className="flex items-center gap-2.5 normal-case tracking-normal py-2">
            <Avatar name={fullName} size={32} />
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[color:var(--ink-1)] truncate">
                {fullName}
              </div>
              <div className="text-[11px] text-[color:var(--ink-3)] truncate">{roleLabel}</div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/ceo/settings">
              <Cog />
              Sozlamalar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            tone="danger"
            disabled={loggingOut}
            onSelect={(event) => {
              event.preventDefault();
              void handleLogout();
            }}
          >
            <LogOut />
            Chiqish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
