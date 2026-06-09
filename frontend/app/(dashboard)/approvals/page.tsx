import { requireSession } from '@/lib/session';
import { ApprovalsView } from '@/features/approvals/components/approvals-view';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage(): Promise<React.ReactElement> {
  await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Ruxsat so'rovlari</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Kech kelish, erta ketish yoki dam olish uchun oldindan ruxsat yuboring
        </p>
      </div>
      <ApprovalsView />
    </div>
  );
}
