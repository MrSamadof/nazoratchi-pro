import { requireCeoSession } from '@/lib/session';
import { CeoInbox } from '@/features/suggestions/components/suggestions-view';

export const dynamic = 'force-dynamic';

export default async function CeoSuggestionsPage(): Promise<React.ReactElement> {
  await requireCeoSession();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em]">Takliflar</h1>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
          Xodimlardan kelgan g&apos;oyalar — holatini belgilang va javob bering
        </p>
      </div>
      <div className="max-w-2xl">
        <CeoInbox />
      </div>
    </div>
  );
}
