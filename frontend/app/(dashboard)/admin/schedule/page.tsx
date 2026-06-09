import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { ScheduleBoard } from '@/features/schedules/components/schedule-board';

export const dynamic = 'force-dynamic';

interface StoresResponse {
  ok: boolean;
  stores: Array<{ id: string; name: string }>;
}

export default async function AdminSchedulePage(): Promise<React.ReactElement> {
  const user = await requireSession();
  if (user.role !== 'manager' && user.role !== 'ceo') redirect('/dashboard');

  const storesRes = await apiFetch<StoresResponse>('/api/stores/full');
  const stores = (storesRes.stores ?? []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Smena jadvali</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Har xodimga har kun uchun smena belgilang. O'zgarishlar darhol saqlanadi.
        </p>
      </div>
      <ScheduleBoard stores={stores} />
    </div>
  );
}
