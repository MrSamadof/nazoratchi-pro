import { requireManagerSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { UsersManager, type StoreOption } from '@/components/ceo/users-manager';
import { ShiftTemplatesManager } from '@/components/ceo/shift-templates-manager';

export const dynamic = 'force-dynamic';

interface StoresResponse {
  ok: boolean;
  stores: Array<{ id: string; name: string }>;
}

export default async function EmployeesPage(): Promise<React.ReactElement> {
  const user = await requireManagerSession();
  const storesRes = await apiFetch<StoresResponse>('/api/admin/stores');
  const stores: StoreOption[] = (storesRes.stores ?? []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Xodimlar</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Xodim qo'shish, tahrirlash va smena soatlarini boshqarish
        </p>
      </div>

      <ShiftTemplatesManager />

      <UsersManager
        stores={stores}
        currentUserId={user.id}
        scope="admin"
        allowedRoles={['employee']}
      />
    </div>
  );
}
