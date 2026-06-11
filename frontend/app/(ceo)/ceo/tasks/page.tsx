import { requireCeoSession } from '@/lib/session';
import { TasksBoard } from '@/features/tasks/components/tasks-board';

export const dynamic = 'force-dynamic';

export default async function CeoTasksPage(): Promise<React.ReactElement> {
  const user = await requireCeoSession();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em]">Topshiriqlar</h1>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
          Topshiriqlar, muddatlar va bajarilish holati
        </p>
      </div>

      <TasksBoard role={user.role} />
    </div>
  );
}
