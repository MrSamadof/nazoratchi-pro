'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bolt,
  BookOpen,
  ChevronsUpDown,
  ClipboardList,
  Clock,
  Gift,
  Home,
  Inbox,
  Lightbulb,
  LogOut,
  Mail,
  Receipt,
  Settings,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { NPMark } from '@/components/brand/np-logo';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useGetNewSuggestionCountQuery } from '@/services/suggestionsApi';

interface NavUser {
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'ceo' | string;
  storeName?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  employee: 'Sotuvchi',
  manager: 'Menejer',
  ceo: 'CEO',
};

const BASE_NAV = [
  { href: '/dashboard', label: 'Bosh sahifa', icon: Home },
  { href: '/attendance', label: 'Davomat', icon: Clock },
  { href: '/sales', label: 'Savdo', icon: Receipt },
  { href: '/reyting', label: 'Reyting', icon: Trophy },
  { href: '/approvals', label: 'Ruxsatlar', icon: Mail },
  { href: '/tasks', label: 'Topshiriqlar', icon: ClipboardList },
  { href: '/rewards', label: "Rag'batlar", icon: Gift },
  { href: '/suggestions', label: 'Takliflar', icon: Lightbulb },
  { href: '/rules', label: 'Qoidalar', icon: BookOpen },
];

export function DashboardSidebar({
  user,
  isAdmin,
  isCeo,
  isManager,
}: {
  user: NavUser;
  isAdmin: boolean;
  isCeo: boolean;
  isManager: boolean;
}): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  // CEO uchun ko'rilmagan takliflar soni — 30 soniyada bir yangilanadi.
  const { data: newSuggestions = 0 } = useGetNewSuggestionCountQuery(undefined, {
    skip: !isCeo,
    pollingInterval: 30_000,
  });
  const fullName = `${user.lastName} ${user.firstName}`.trim() || user.firstName;
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  // Do'kon biriktirilmagan menejer/CEO uchun joy nomi sifatida "Ofis".
  const placeName =
    user.storeName ?? (isManager || isCeo ? 'Ofis' : "Doʻkon yoʻq");

  // Savdo kiritish — menejer va CEO ko'rmaydi; davomat — faqat CEO ko'rmaydi
  // (menejer ham kelish/ketish topshiradi); savdo reytingi — menejer ko'rmaydi.
  const hidden = new Set<string>();
  if (isCeo || isManager) {
    hidden.add('/sales');
  }
  if (isCeo) hidden.add('/attendance');
  if (isManager) hidden.add('/reyting');

  const nav = [
    ...BASE_NAV.filter((item) => !hidden.has(item.href)),
    ...(isAdmin ? [{ href: '/admin', label: 'Boshqaruv', icon: Inbox }] : []),
  ];

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
    <aside className="hidden lg:flex flex-col w-[232px] shrink-0 p-4 gap-1 sticky top-0 h-screen overflow-hidden bg-card border-r border-[color:var(--border)]">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-4 pt-2">
        <NPMark size={28} />
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">
            Nazoratchi <span className="text-[color:var(--ink-3)]">AI</span>
          </div>
          <div className="text-[10.5px] text-[color:var(--ink-3)] uppercase tracking-[0.06em]">
            {roleLabel}
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {nav.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)]',
              )}
            >
              <Icon className="size-[15px]" />
              {item.label}
              {item.href === '/suggestions' && newSuggestions > 0 && (
                <span
                  className={cn(
                    'ml-auto min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10.5px] font-semibold tabular',
                    isActive
                      ? 'bg-white/25 text-primary-foreground'
                      : 'bg-[color:var(--rose)] text-white',
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
            'bg-[color:var(--background-2)] hover:bg-[color:var(--background-3,var(--background-2))]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors',
          )}
        >
          <Avatar name={fullName} size={32} />
          <div className="leading-tight min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">{fullName}</div>
            <div className="text-[10.5px] text-[color:var(--ink-3)] truncate">
              {placeName}
            </div>
          </div>
          <ChevronsUpDown className="size-[14px] text-[color:var(--ink-3)] shrink-0" />
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
          {isCeo && (
            <DropdownMenuItem asChild>
              <Link href="/ceo">
                <Bolt />
                Executive panel
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserRound />
              Profil
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Settings />
                Sozlamalar
              </Link>
            </DropdownMenuItem>
          )}
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
