import { requireSession } from '@/lib/session';
import { TasksBoard } from '@/features/tasks/components/tasks-board';

export const dynamic = 'force-dynamic';

export default async function TasksPage(): Promise<React.ReactElement> {
  const user = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Topshiriqlar</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Topshiriqlar, muddatlar va bajarilish holati. Muddat yetmasa surishni so&apos;rang.
        </p>
      </div>
      <TasksBoard role={user.role} />
    </div>
  );
}
