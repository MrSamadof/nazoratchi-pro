import { requireSession } from '@/lib/session';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { TelegramLinkCard } from '@/components/telegram-link-card';

const ROLE_LABEL: Record<string, string> = {
  employee: 'Sotuvchi',
  manager: 'Menejer',
  ceo: 'CEO',
};

export default async function ProfilePage(): Promise<React.ReactElement> {
  const user = await requireSession();
  const fullName = `${user.lastName ?? ''} ${user.firstName}`.trim() || user.firstName;
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Profil</h1>
        <p className="mt-1 text-[13px] text-[color:var(--ink-3)]">
          Hisob ma&apos;lumotlari va bildirishnoma sozlamalari.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar name={fullName} size={52} />
          <div className="min-w-0">
            <div className="text-[16px] font-semibold truncate">{fullName}</div>
            <div className="text-[13px] text-[color:var(--ink-3)]">
              {roleLabel} · {user.phone}
            </div>
          </div>
        </CardContent>
      </Card>

      <TelegramLinkCard />
    </div>
  );
}
