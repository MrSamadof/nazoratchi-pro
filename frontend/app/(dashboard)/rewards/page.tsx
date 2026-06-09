import { requireSession } from '@/lib/session';
import { RewardsView } from '@/features/rewards/components/rewards-view';

export const dynamic = 'force-dynamic';

export default async function RewardsPage(): Promise<React.ReactElement> {
  const user = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Rag&apos;batlar</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Rag&apos;bat so&apos;rang yoki bering — eng ko&apos;p sotgan do&apos;kon va xodimlar avtomatik
          rag&apos;batlanadi
        </p>
      </div>
      <RewardsView role={user.role} currentUserId={user.id} />
    </div>
  );
}
