import { requireSession } from '@/lib/session';
import { SuggestionsView } from '@/features/suggestions/components/suggestions-view';

export const dynamic = 'force-dynamic';

export default async function SuggestionsPage(): Promise<React.ReactElement> {
  const user = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Takliflar</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Ish unumini oshiradigan g&apos;oyalaringizni yozing — to&apos;g&apos;ridan-to&apos;g&apos;ri
          CEO ga boradi
        </p>
      </div>
      <SuggestionsView role={user.role} />
    </div>
  );
}
