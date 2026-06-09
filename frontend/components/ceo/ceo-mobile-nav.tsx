'use client';

import { Bolt, Cog, Home, Lightbulb, Store, Users, Wallet } from 'lucide-react';
import { MobileMenuDrawer, type MobileMenuItem } from '@/components/mobile-menu-drawer';
import { useGetNewSuggestionCountQuery } from '@/services/suggestionsApi';

const NAV: MobileMenuItem[] = [
  { href: '/ceo', label: 'Bosh sahifa', icon: Home },
  { href: '/ceo/stores', label: "Do'konlar", icon: Store },
  { href: '/ceo/finance', label: 'Moliyaviy', icon: Wallet },
  { href: '/ceo/ai-analysis', label: 'AI tahlil', icon: Bolt },
  { href: '/ceo/team', label: 'Jamoa', icon: Users },
  { href: '/ceo/suggestions', label: 'Takliflar', icon: Lightbulb },
  { href: '/ceo/settings', label: 'Sozlamalar', icon: Cog },
];

export function CeoMobileNav({
  fullName,
  roleLabel,
}: {
  fullName: string;
  roleLabel: string;
}): React.ReactElement {
  // Ko'rilmagan takliflar soni — 30 soniyada bir yangilanadi.
  const { data: newSuggestions = 0 } = useGetNewSuggestionCountQuery(undefined, {
    pollingInterval: 30_000,
  });

  const items: MobileMenuItem[] = NAV.map((it) => ({
    ...it,
    badge: it.href === '/ceo/suggestions' ? newSuggestions : undefined,
  }));

  return (
    <MobileMenuDrawer items={items} fullName={fullName} roleLabel={roleLabel} homeHref="/ceo" />
  );
}
