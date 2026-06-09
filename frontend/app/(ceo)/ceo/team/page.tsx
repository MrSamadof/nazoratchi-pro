import { requireCeoSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { UsersManager, type StoreOption } from '@/components/ceo/users-manager';

export const dynamic = 'force-dynamic';

interface StoresResponse {
  ok: boolean;
  stores: Array<{ id: string; name: string }>;
}

export default async function CeoTeamPage(): Promise<React.ReactElement> {
  const user = await requireCeoSession();

  const storesRes = await apiFetch<StoresResponse>('/api/stores/full');
  const stores: StoreOption[] = (storesRes.stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em]">Jamoa boshqaruvi</h1>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
          Foydalanuvchilar, rollar, bo'limlar va do'kon biriktirish
        </p>
      </div>

      <UsersManager stores={stores} currentUserId={user.id} />
    </div>
  );
}
