import { requireManagerSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { RulesManager, type Rule } from '@/components/admin/rules-manager';

export const dynamic = 'force-dynamic';

interface RulesResp {
  ok: boolean;
  rules: Rule[];
}

export default async function AdminRulesPage(): Promise<React.ReactElement> {
  await requireManagerSession();
  const data = await apiFetch<RulesResp>('/api/rules/admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Qoidalar</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Kompaniya qoidalarini boshqaring — xodimlar /rules sahifasida koʻradi
        </p>
      </div>

      <RulesManager initialRules={data.rules ?? []} />
    </div>
  );
}
