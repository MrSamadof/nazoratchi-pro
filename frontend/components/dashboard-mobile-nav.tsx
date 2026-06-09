'use client';

import { BookOpen, Bolt, ClipboardList, Clock, Gift, Home, Inbox, Lightbulb, Mail, Receipt, Trophy } from 'lucide-react';
import { MobileMenuDrawer, type MobileMenuItem } from '@/components/mobile-menu-drawer';
import { useGetNewSuggestionCountQuery } from '@/services/suggestionsApi';

interface Props {
  isAdmin: boolean;
  isCeo: boolean;
  isManager: boolean;
  fullName: string;
  roleLabel: string;
}

const BASE = [
  { href: '/dashboard', label: 'Bosh sahifa', icon: Home },
  { href: '/attendance', label: 'Davomat', icon: Clock },
  { href: '/sales', label: 'Savdo', icon: Receipt },
  { href: '/reyting', label: 'Reyting', icon: Trophy },
  { href: '/approvals', label: 'Ruxsatlar', icon: Mail },
  { href: '/tasks', label: 'Topshiriqlar', icon: ClipboardList },
  { href: '/rewards', label: "Rag'batlar", icon: Gift },
  { href: '/suggestions', label: 'Takliflar', icon: Lightbulb },
  { href: '/rules', label: 'Qoidalar', icon: BookOpen },
] as const;

export function DashboardMobileNav({
  isAdmin,
  isCeo,
  isManager,
  fullName,
  roleLabel,
}: Props): React.ReactElement {
  // CEO uchun ko'rilmagan takliflar soni — 30 soniyada bir yangilanadi.
  const { data: newSuggestions = 0 } = useGetNewSuggestionCountQuery(undefined, {
    skip: !isCeo,
    pollingInterval: 30_000,
  });

  // Savdo kiritish — menejer va CEO ko'rmaydi; davomat — faqat CEO ko'rmaydi
  // (menejer ham kelish/ketish topshiradi); savdo reytingi — menejer ko'rmaydi.
  const hidden = new Set<string>();
  if (isCeo || isManager) {
    hidden.add('/sales');
  }
  if (isCeo) hidden.add('/attendance');
  if (isManager) hidden.add('/reyting');

  const items: MobileMenuItem[] = BASE.filter((it) => !hidden.has(it.href)).map((it) => ({
    href: it.href,
    label: it.label,
    icon: it.icon,
    badge: it.href === '/suggestions' ? newSuggestions : undefined,
  }));
  if (isAdmin) items.push({ href: '/admin', label: 'Boshqaruv', icon: Inbox });
  if (isCeo) items.push({ href: '/ceo', label: 'Executive panel', icon: Bolt });

  return (
    <MobileMenuDrawer items={items} fullName={fullName} roleLabel={roleLabel} homeHref="/dashboard" />
  );
}
